import { onUnmounted, ref } from 'vue'
import { autorun, callMethod, MethodResultCallback, Stoppable, subscribe } from './MeteorTracker'

export const useAutorun = makeComposable<'autorun', ReturnType<typeof autorun>, typeof autorun>('autorun', autorun)
export const useSubscribe = makeComposable<'subscribe', ReturnType<typeof subscribe>, typeof subscribe>(
  'subscribe',
  subscribe,
)

export function useMethod<TArgs extends any[] = any[], TResult = any> (name: string) {
  const pending = ref(false)
  const error = ref<Error>()
  const result = ref<TResult>()
  const callbacks: MethodResultCallback<TResult>[] = []

  async function call (...args: TArgs) {
    pending.value = true
    error.value = undefined
    try {
      result.value = await callMethod(name, ...args)
      return result.value
    } catch (e) {
      error.value = e as Error
    } finally {
      pending.value = false
      callbacks.forEach(callback => callback(error.value, result.value))
    }
  }

  function onResult (callback: MethodResultCallback<TResult>) {
    callbacks.push(callback)
  }

  return {
    call,
    pending,
    error,
    result,
    onResult,
  }
}

function makeComposable<
    TName extends string = string,
    TReturn extends Stoppable = Stoppable,
    TFn extends (...args: any[]) => TReturn = (...args: any[]) => TReturn
>(name: TName, fn: TFn): () => {
  [K in TName]: TFn
} {
  return () => {
    const effects: Stoppable[] = []

    const _run = ((...args) => {
      const effect = fn(...args)
      effects.push(effect)
      return effect
    }) as TFn

    onUnmounted(() => {
      effects.forEach(effect => effect.stop())
    })

    return {
      [name]: _run,
    } as {
      [K in TName]: TFn
    }
  }
}
