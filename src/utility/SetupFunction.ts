import { getCurrentInstance } from 'vue'
import { autorun, subscribe } from './MeteorTracker'

function makeSetupOnlyFunction<
    TFn extends (...args: any[]) => any
>(fn: TFn): TFn {
  return ((...args) => {
    if (process.env.NODE_ENV !== 'production') {
      if (!getCurrentInstance()) {
        console.warn(`'${fn.name}()' should only be used in setup() inside components to clean up correctly. If you need to call '${fn.name}' later outside of the setup context, use 'use${fn.name[0].toUpperCase()}${fn.name.slice(
                    1)}()' instead.`)
      }
    }
    return fn(...args)
  }) as TFn
}

export const setupOnlyAutorun = makeSetupOnlyFunction(autorun)
export const setupOnlySubscribe = makeSetupOnlyFunction(subscribe)
