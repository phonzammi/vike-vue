import { createApp, createSSRApp, defineComponent, h, markRaw, reactive } from 'vue'
import type { Component, PageProps } from './types'
import type { Config, PageContext } from 'vike/types'
import { setPageContext } from '../components/usePageContext.js'
import { render } from 'vike/abort'

export { createVueApp }

/**
 * Isomorphic function to create a Vue app.
 *
 * @param pageContext Object providing the Vue component to be rendered, the props for that component, and additional
 *                    config and data.
 * @param ssrApp Whether to use `createSSRApp()` or `createApp()`. See https://vuejs.org/api/application.html
 * @param renderHead If true, `pageContext.config.Head` will be rendered instead of `pageContext.Page`.
 */
function createVueApp(pageContext: PageContext, ssrApp = true, renderHead = false) {
  const { Page } = pageContext
  const Head = renderHead ? (pageContext.config.Head as Component) : undefined

  let rootComponent: Component & { Page: Component; pageProps: PageProps; config: Config }
  const PageWithLayout = defineComponent({
    data: () => ({
      Page: markRaw(Head ? Head : Page),
      pageProps: markRaw(pageContext.pageProps || {}),
      config: markRaw(pageContext.config)
    }),
    created() {
      rootComponent = this
    },
    render() {
      if (!!this.config.Layout && !renderHead) {
        return h(
          this.config.Layout,
          {},
          {
            default: () => {
              return h(this.Page, this.pageProps)
            }
          }
        )
      }
      return h(this.Page, this.pageProps)
    }
  })

  const app = ssrApp ? createSSRApp(PageWithLayout) : createApp(PageWithLayout)

  // We use `app.changePage()` to do Client Routing, see `onRenderClient.ts`
  objectAssign(app, {
    changePage: (pageContext: PageContext) => {
      // let err: unknown
      app.config.errorHandler = (err_) => {
        // err = err_ // err still undefinded for first time navigate to an error page, but will be defined when navigating from an error page
        if (err_) location.reload() // Note (@phonzammi) : AFAIK working workaround right now, even in production build
        // if (err_) throw render(500) // this condition return the following error :
        /**
         * abort.js:77 Uncaught (in promise) Error: AbortRender
         * at AbortRender (abort.js:77:17)
         * at render_ (abort.js:73:16)
         * at render (abort.js:47:12)
         * at app2.config.errorHandler (app.js:46:27)
         * at callWithErrorHandling (runtime-core.esm-bundler.js:158:18)
         * at handleError (runtime-core.esm-bundler.js:199:7)
         * at callWithErrorHandling (runtime-core.esm-bundler.js:160:5)
         * at setupStatefulComponent (runtime-core.esm-bundler.js:7331:25)
         * at setupComponent (runtime-core.esm-bundler.js:7292:36)
         * at mountComponent (runtime-core.esm-bundler.js:5687:7)
         */
      }
      Object.assign(pageContextReactive, pageContext)
      rootComponent.Page = markRaw(pageContext.Page)
      rootComponent.pageProps = markRaw(pageContext.pageProps || {})
      rootComponent.config = markRaw(pageContext.config)
    }
  })

  // When doing Client Routing, we mutate pageContext (see usage of `app.changePage()` in `onRenderClient.ts`).
  // We therefore use a reactive pageContext.
  const pageContextReactive = reactive(pageContext)

  // Make `pageContext` accessible from any Vue component
  setPageContext(app, pageContextReactive)

  return app
}

// Same as `Object.assign()` but with type inference
function objectAssign<Obj extends object, ObjAddendum>(
  obj: Obj,
  objAddendum: ObjAddendum
): asserts obj is Obj & ObjAddendum {
  Object.assign(obj, objAddendum)
}
