import { Context as LambdaContext, Handler as LambdaHandler } from 'aws-lambda'

declare type PluginHook = () => void
declare type PluginHookWithMiddlewareName = (middlewareName: string) => void
declare type PluginHookPromise = (
  request: Request
) => Promise<unknown> | unknown

interface PluginObject {
  internal?: any
  beforePrefetch?: PluginHook
  requestStart?: PluginHook
  beforeMiddleware?: PluginHookWithMiddlewareName
  afterMiddleware?: PluginHookWithMiddlewareName
  beforeHandler?: PluginHook
  timeoutEarlyInMillis?: number
  timeoutEarlyResponse?: PluginHook
  afterHandler?: PluginHook
  requestEnd?: PluginHookPromise
  streamifyResponse?: Boolean
}

export interface Request<
  TEvent = any,
  TBaseResult = any,
  TErr = Error,
  TContext extends LambdaContext = LambdaContext,
  TTransformedEvent = TEvent,
  TTransformedResult = TBaseResult,
  TInternal extends Record<string, unknown> = {}
> {
  event: TEvent & TTransformedEvent
  context: TContext
  response: (TBaseResult & TTransformedResult) | null
  error: TErr | null
  internal: TInternal
}

declare type MiddlewareFn<
  TEvent = any,
  TBaseResult = any,
  TErr = Error,
  TContext extends LambdaContext = LambdaContext,
  TTransformedEvent = TEvent,
  TTransformedResult = TBaseResult,
  TInternal extends Record<string, unknown> = {}
> = (
  request: Request<
    TEvent,
    TBaseResult,
    TErr,
    TContext,
    TTransformedEvent,
    TTransformedResult,
    TInternal
  >
) => any

export interface MiddlewareObj<
  TEvent = unknown,
  TBaseResult = any,
  TErr = Error,
  TContext extends LambdaContext = LambdaContext,
  TTransformedEvent = TEvent,
  TTransformedResult = TBaseResult,
  TInternal extends Record<string, unknown> = {}
> {
  before?: MiddlewareFn<
    TEvent,
    TBaseResult,
    TErr,
    TContext,
    TTransformedEvent,
    TTransformedResult,
    Internal
  >
  after?: MiddlewareFn<
    TEvent,
    TBaseResult,
    TErr,
    TContext,
    TTransformedEvent,
    TTransformedResult,
    TInternal
  >
  onError?: MiddlewareFn<
    TEvent,
    TBaseResult,
    TErr,
    TContext,
    TTransformedEvent,
    TTransformedResult,
    TInternal
  >
  name?: string
}

export interface MiddyHandlerObject {
  /**
   * An abort signal that will be canceled just before the lambda times out.
   * @see timeoutEarlyInMillis
   */
  signal: AbortSignal
}

// The AWS provided Handler type uses void | Promise<TResult> so we have no choice but to follow and suppress the linter warning
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
type MiddyInputHandler<
  TEvent,
  TResult,
  TContext extends LambdaContext = LambdaContext
> = (
  event: TEvent,
  context: TContext,
  opts: MiddyHandlerObject
) => // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
void | Promise<TResult> | TResult
type MiddyInputPromiseHandler<
  TEvent,
  TResult,
  TContext extends LambdaContext = LambdaContext
> = (event: TEvent, context: TContext) => Promise<TResult>

export interface MiddyfiedHandler<
  TEvent = any,
  TResult = any,
  TErr = Error,
  TContext extends LambdaContext = LambdaContext,
  TInternal extends Record<string, unknown> = {}
> extends MiddyInputHandler<TEvent, TResult, TContext>,
    MiddyInputPromiseHandler<TEvent, TResult, TContext> {
  use: UseFn<TEvent, TResult, TErr, TContext, TInternal>
  before: AttachMiddlewareFn<TEvent, TResult, TErr, TContext, TInternal>
  after: AttachMiddlewareFn<TEvent, TResult, TErr, TContext, TInternal>
  onError: AttachMiddlewareFn<TEvent, TResult, TErr, TContext, TInternal>
  handler: <THandlerEvent, THandlerResult>(
    handler:
      | MiddlewareHandler<
          LambdaHandler<THandlerEvent, THandlerResult>,
          TContext
        >
      | LambdaHandler<THandlerEvent, THandlerResult>
  ) => MiddyfiedHandler<THandlerEvent, TResult, TErr, TContext, TInternal>
}

declare type AttachMiddlewareFn<
  TEvent = any,
  TResult = any,
  TErr = Error,
  TContext extends LambdaContext = LambdaContext,
  TInternal extends Record<string, unknown> = {}
> = (
  middleware: MiddlewareFn<TEvent, TResult, TErr, TContext, TInternal>
) => MiddyfiedHandler<TEvent, TResult, TErr, TContext, TInternal>

declare type AttachMiddlewareObj<
  TEvent = any,
  TResult = any,
  TErr = Error,
  TContext extends LambdaContext = LambdaContext,
  TInternal extends Record<string, unknown> = {}
> = (
  middleware: MiddlewareObj<TEvent, TResult, TErr, TContext, TInternal>
) => MiddyfiedHandler<TEvent, TResult, TErr, TContext, TInternal>

declare type UseFn<
  TEvent = any,
  TResult = any,
  TErr = Error,
  TContext extends LambdaContext = LambdaContext,
  TInternal extends Record<string, unknown> = {}
> = <TMiddleware extends MiddlewareObj<any, any, Error, any, any, any, any>>(
  middlewares: TMiddleware | TMiddleware[]
) => TMiddleware extends MiddlewareObj<
  any,
  any,
  infer MErr,
  infer MContext,
  infer MTransformedEvent,
  infer MTransformedResult,
  infer MInternal
>
  ? MiddyfiedHandler<
      TEvent & MTransformedEvent,
      TResult & MTransformedResult,
      TErr | MErr,
      TContext & MContext,
      TInternal & MInternal
    > // always true
  : never

declare type MiddlewareHandler<
  THandler extends LambdaHandler<any, any>,
  TContext extends LambdaContext = LambdaContext
> =
  THandler extends LambdaHandler<infer TEvent, infer TResult> // always true
    ? MiddyInputHandler<TEvent, TResult, TContext>
    : never

/**
 * Middy factory function. Use it to wrap your existing handler to enable middlewares on it.
 * @param handler your original AWS Lambda function
 * @param plugin wraps around each middleware and handler to add custom lifecycle behaviours (e.g. to profile performance)
 */
declare function middy<
  TEvent = unknown,
  TResult = any,
  TErr = Error,
  TContext extends LambdaContext = LambdaContext,
  TInternal extends Record<string, unknown> = {}
>(
  handler?:
    | LambdaHandler<TEvent, TResult>
    | MiddlewareHandler<LambdaHandler<TEvent, TResult>, TContext>
    | PluginObject,
  plugin?: PluginObject
): MiddyfiedHandler<TEvent, TResult, TErr, TContext, TInternal>

declare namespace middy {
  export {
    Request,
    PluginHook,
    PluginHookWithMiddlewareName,
    PluginObject,
    MiddlewareFn,
    MiddlewareObj,
    MiddyfiedHandler
  }
}

export default middy
