// https://vike.dev/onRenderHtml
export { onRenderHtml }

import { renderToNodeStream, renderToString } from '@vue/server-renderer'
import { dangerouslySkipEscape, escapeInject } from 'vike/server'
import { getTitle } from './getTitle.js'
import type { OnRenderHtmlAsync } from 'vike/types'
import { createVueApp } from './app.js'

const onRenderHtml: OnRenderHtmlAsync = async (pageContext): ReturnType<OnRenderHtmlAsync> => {
  let pageStream: ReturnType<typeof renderToNodeStream> | string = ''
  if (pageContext.Page !== undefined) {
    // SSR is enabled
    const app = createVueApp(pageContext)
    if (pageContext.config.vuePlugins) {
      pageContext.config.vuePlugins.forEach(({ plugin, options }) => {
        app.use(plugin, options)
      })
    }
    pageStream = renderToNodeStream(app)
  }

  const title = getTitle(pageContext)
  const titleTag = !title ? '' : escapeInject`<title>${title}</title>`

  const { description } = pageContext.config
  const descriptionTag = !description ? '' : escapeInject`<meta name="description" content="${description}" />`

  const { favicon } = pageContext.config
  const faviconTag = !favicon ? '' : escapeInject`<link rel="icon" href="${favicon}" />`

  let headHtml = ''
  if (pageContext.config.Head !== undefined) {
    const app = createVueApp(pageContext, /*ssrApp*/ true, /*renderHead*/ true)
    headHtml = await renderToString(app)
  }

  const lang = pageContext.config.lang || 'en'

  const documentHtml = escapeInject`<!DOCTYPE html>
    <html lang='${lang}'>
      <head>
        <meta charset="UTF-8" />
        ${faviconTag}
        ${titleTag}
        ${descriptionTag}
        ${dangerouslySkipEscape(headHtml)}
      </head>
      <body>
        <div id="page-view">${pageStream}</div>
      </body>
      <!-- built with https://github.com/vikejs/vike-vue -->
    </html>`

  return {
    documentHtml,
    pageContext: {
      enableEagerStreaming: true
    }
  }
}
