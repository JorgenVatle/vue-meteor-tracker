import { App, reactive } from 'vue'
import { useAutorun, useMethod, useSubscribe } from './utility/Composable'
import { autorun, AutorunEffect, callMethod, config, ReactiveMeteorSubscription, subscribe } from './utility/MeteorTracker'
import { setupOnlyAutorun, setupOnlySubscribe } from './utility/SetupFunction'

export const VueMeteor = {
  install (app: App) {
    app.mixin({
      beforeCreate () {
        if (!this.$options.meteor) {
          return
        }

        const subReady = reactive<Record<string, boolean>>({})

        if (this.$options.meteor.$subscribe) {
          for (const key in this.$options.meteor.$subscribe) {
            const value = this.$options.meteor.$subscribe[key]
            const { ready } = typeof value === 'function'
              ? subscribe(() => {
                const result = value.call(this)
                return [key, ...result]
              })
              : subscribe(key, ...value)
            // @ts-expect-error unwrapping
            subReady[key] = ready
          }
        }

        this.$options.computed = this.$options.computed || {}
        this.$options.computed.$subReady = () => subReady

        const { subscribe: $subscribe } = useSubscribe()
        this.$options.methods = this.$options.methods || {}
        this.$options.methods.$subscribe = $subscribe

        for (const key in this.$options.meteor) {
          if (key.startsWith('$')) continue
          const fn = this.$options.meteor[key]
          const { result } = autorun(fn.bind(this))
          this.$options.computed[key] = () => result.value
        }
      },
    })
  },
}

export {
  config,
  callMethod,
  useMethod,
  useAutorun,
  useSubscribe,
  setupOnlyAutorun as autorun,
  setupOnlySubscribe as subscribe,
}

export type {
  AutorunEffect,
  ReactiveMeteorSubscription,
}
