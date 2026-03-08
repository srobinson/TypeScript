// @strict: true
// @noEmit: true

// Repro from #62824

// Minimal repro: silentNeverType leaks through keyof in mapped types
// when a nested generic call has no inference candidates during the
// outer call's inference pass.

type Fn<T> = (arg: T) => void;

declare function fn1<T>(): Fn<T>;

declare function fn2<T>(
  ac: Fn<{
    [K in keyof T & string]: T[K];
  }>,
): void;

fn2(fn1());

// Full repro from issue
type Values<T> = T[keyof T];

type MachineContext = Record<string, any>;

interface ParameterizedObject {
    type: string;
    params?: unknown;
}

type ActionFunction<
    TContext extends MachineContext,
    TParams extends ParameterizedObject["params"] | undefined,
    TAction extends ParameterizedObject,
> = {
    (ctx: TContext, params: TParams): void;
    _out_TAction?: TAction;
};

type ToParameterizedObject<
    TParameterizedMap extends Record<
        string,
        ParameterizedObject["params"] | undefined
    >,
> = Values<{
    [K in keyof TParameterizedMap & string]: {
        type: K;
        params: TParameterizedMap[K];
    };
}>;

type CollectActions<
    TContext extends MachineContext,
    TParams extends ParameterizedObject["params"] | undefined,
> = (
    {
        context,
        enqueue,
    }: {
        context: TContext;
        enqueue: (action: () => void) => void;
    },
    params: TParams,
) => void;

declare function enqueueActions<
    TContext extends MachineContext,
    TParams extends ParameterizedObject["params"] | undefined,
    TAction extends ParameterizedObject = ParameterizedObject,
>(
    collect: CollectActions<TContext, TParams>,
): ActionFunction<TContext, TParams, TAction>;

declare function setup<
    TContext extends MachineContext,
    TActions extends Record<
        string,
        ParameterizedObject["params"] | undefined
    > = {},
>({
    types,
    actions,
}: {
    types?: { context?: TContext };
    actions?: {
        [K in keyof TActions]: ActionFunction<
            TContext,
            TActions[K],
            ToParameterizedObject<TActions>
        >;
    };
}): void;

// Single action with enqueueActions
setup({
    actions: {
        doStuff: enqueueActions((_, params: number) => {}),
    },
});

// Two actions, second without explicit context type
setup({
    actions: {
        doStuff: enqueueActions((_, params: number) => {}),
        doOtherStuff: (_, params: string) => {},
    },
});

// Two actions, second with explicit any context type
setup({
    actions: {
        doStuff: enqueueActions((_, params: number) => {}),
        doOtherStuff: (_: any, params: string) => {},
    },
});
