import { Meteor } from 'meteor/meteor'
import { Tracker } from 'meteor/tracker'
import { computed, ComputedRef, getCurrentInstance, markRaw, onUnmounted, ref, watch, watchEffect } from 'vue'

export const config = {
  subscribe: Meteor.subscribe,
}

export interface Stoppable {
    stop: () => void;
}

export interface AutorunEffect<TResult> extends Stoppable {
    result: ComputedRef<TResult>;
}

export interface ReactiveMeteorSubscription extends Stoppable {
    ready: ComputedRef<boolean>;
    sub: Meteor.SubscriptionHandle;
}

export function autorun<TResult = unknown> (callback: () => TResult): AutorunEffect<TResult> {
  const result = ref<TResult>()
  const stop = watchEffect((onInvalidate) => {
    const computation = Tracker.autorun(() => {
      let value: any = callback()
      if (typeof value?.fetch === 'function') {
        value = value.fetch()
      }
      result.value = value && typeof value === 'object' ? markRaw(value as unknown as object) as TResult : value
    })
    onInvalidate(() => {
      computation.stop()
    })
  })
  return {
    result: computed<TResult>(() => result.value as TResult),
    stop,
  }
}

export function subscribe (
  payload: string | (() => [name: string, ...args: any[]] | false),
  ...args: any[]
): ReactiveMeteorSubscription {
  if (typeof payload === 'string') {
    return simpleSubscribe(payload, ...args)
  } else {
    return watchSubscribe(payload)
  }
}

function simpleSubscribe (name: string, ...args: any[]): ReactiveMeteorSubscription {
  const sub = config.subscribe(name, ...args)
  const ready = autorun(() => sub.ready())

  function stop (): void {
    ready.stop()
    sub.stop()
  }

  getCurrentInstance() && onUnmounted(() => {
    stop()
  })

  return {
    stop,
    ready: ready.result,
    sub,
  }
}

function watchSubscribe (callback: () => [name: string, ...args: any[]] | false): ReactiveMeteorSubscription {
  const ready = ref(false)
  const sub = ref<Meteor.SubscriptionHandle>()
  const stop = watch(callback, (value, oldValue, onInvalidate) => {
    if (value !== false) {
      sub.value = markRaw(config.subscribe(...value))

      const computation = Tracker.autorun(() => {
        ready.value = sub.value.ready()
      })

      onInvalidate(() => {
        sub.value.stop()
        computation.stop()
      })
    }
  }, {
    immediate: true,
    deep: true,
  })

  return {
    stop,
    ready: computed(() => ready.value),
    get sub () {
      return sub.value
    },
  }
}

export type MethodResultCallback<TResult = any> = (error: Error | undefined, result: TResult | undefined) => unknown

export function callMethod<
    TResult = any
> (methodName: string, ...args: any[]): Promise<TResult> {
  return new Promise<TResult>((resolve, reject) => {
    Meteor.call(methodName, ...args, (err: Error, res: TResult) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
