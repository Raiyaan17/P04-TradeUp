//#region src/dual.ts
/**
* Creates data-first/data-last dual function.
*
* @template DataLast Curried (data-last) signature.
* @template DataFirst Uncurried (data-first) signature.
* @param arity Number of args for data-first form.
* @param body Implementation function.
* @returns Function supporting both calling conventions.
*
* @example
* const add: {
*   (a: number, b: number): number;
*   (b: number): (a: number) => number;
* } = dual(2, (a: number, b: number) => a + b);
*
* add(1, 2);  // 3 (data-first)
* add(2)(1);  // 3 (data-last)
*/
function dual(arity, body) {
	if (arity === 2) return ((...args) => {
		if (args.length >= 2) return body(args[0], args[1]);
		return (self) => body(self, args[0]);
	});
	if (arity === 3) return ((...args) => {
		if (args.length >= 3) return body(args[0], args[1], args[2]);
		return (self) => body(self, args[0], args[1]);
	});
	if (arity === 4) return ((...args) => {
		if (args.length >= 4) return body(args[0], args[1], args[2], args[3]);
		return (self) => body(self, args[0], args[1], args[2]);
	});
	return ((...args) => {
		if (args.length >= arity) return body(...args);
		return (self) => body(self, ...args);
	});
}

//#endregion
//#region src/error.ts
/** Serialize cause for JSON output */
const serializeCause = (cause) => {
	if (cause instanceof Error) return {
		name: cause.name,
		message: cause.message,
		stack: cause.stack
	};
	return cause;
};
/** Type guard for any tagged error */
const isAnyTaggedError = (value) => {
	return value instanceof Error && "_tag" in value && typeof value._tag === "string";
};
/**
* Factory for tagged error classes.
*
* @example
* class NotFoundError extends TaggedError("NotFoundError")<{
*   id: string;
*   message: string;
* }>() {}
*
* const err = new NotFoundError({ id: "123", message: "Not found: 123" });
* err._tag    // "NotFoundError"
* err.id      // "123"
* err.message // "Not found: 123"
*
* // Check if any tagged error
* TaggedError.is(err) // true
*/
const TaggedError = Object.assign((tag) => () => {
	class Base extends Error {
		_tag = tag;
		/** Type guard for this error class */
		static is(value) {
			return value instanceof Base;
		}
		constructor(args) {
			const message = args && "message" in args && typeof args.message === "string" ? args.message : void 0;
			const cause = args && "cause" in args ? args.cause : void 0;
			super(message, cause !== void 0 ? { cause } : void 0);
			if (args) Object.assign(this, args);
			Object.setPrototypeOf(this, new.target.prototype);
			this.name = tag;
			if (cause instanceof Error && cause.stack) {
				const indented = cause.stack.replace(/\n/g, "\n  ");
				this.stack = `${this.stack}\nCaused by: ${indented}`;
			}
		}
		toJSON() {
			return {
				...this,
				_tag: this._tag,
				name: this.name,
				message: this.message,
				cause: serializeCause(this.cause),
				stack: this.stack
			};
		}
	}
	return Base;
}, { is: isAnyTaggedError });
/**
* Exhaustive pattern match on tagged error union.
*
* @example
* // Data-first
* matchError(err, {
*   NotFoundError: (e) => `Missing: ${e.id}`,
*   ValidationError: (e) => `Invalid: ${e.field}`,
* });
*
* // Data-last (pipeable)
* pipe(err, matchError({
*   NotFoundError: (e) => `Missing: ${e.id}`,
*   ValidationError: (e) => `Invalid: ${e.field}`,
* }));
*/
const matchError = dual(2, (err$1, handlers) => {
	const handler = handlers[err$1._tag];
	return handler(err$1);
});
/**
* Partial pattern match with fallback for unhandled tags.
*
* @example
* matchErrorPartial(err, {
*   NotFoundError: (e) => `Missing: ${e.id}`,
* }, (e) => `Unknown: ${e.message}`);
*/
const matchErrorPartial = dual(3, (err$1, handlers, fallback) => {
	const handler = handlers[err$1._tag];
	if (typeof handler === "function") return handler(err$1);
	return fallback(err$1);
});
/**
* Type guard for tagged error instances.
*
* @example
* if (isTaggedError(value)) { value._tag }
*/
const isTaggedError = isAnyTaggedError;
/**
* Wraps exceptions caught by Result.try/tryPromise.
* Custom constructor derives message from cause.
*/
var UnhandledException = class extends TaggedError("UnhandledException")() {
	constructor(args) {
		const message = args.cause instanceof Error ? `Unhandled exception: ${args.cause.message}` : `Unhandled exception: ${String(args.cause)}`;
		super({
			message,
			cause: args.cause
		});
	}
};
/**
* Unrecoverable error — user code threw inside Result operations.
*
* @example
* // Panic in generator cleanup:
* Result.gen(function* () {
*   try {
*     yield* Result.err("expected error");
*   } finally {
*     throw new Error("cleanup failed");  // Panic!
*   }
* });
*
* // Panic in combinator:
* Result.ok(1).map(() => { throw new Error("oops"); });  // Panic!
*/
var Panic = class extends TaggedError("Panic")() {};
/**
* Returned when Result.deserialize receives invalid input.
*
* @example
* const result = Result.deserialize(invalidData);
* if (Result.isError(result) && ResultDeserializationError.is(result.error)) {
*   console.log("Invalid input:", result.error.value);
* }
*/
var ResultDeserializationError = class extends TaggedError("ResultDeserializationError")() {
	constructor(args) {
		super({
			message: `Failed to deserialize value as Result: expected { status: "ok", value } or { status: "error", error }`,
			value: args.value
		});
	}
};
/**
* Type guard for Panic instances.
*
* @example
* if (isPanic(value)) { value.cause }
*/
const isPanic = (value) => {
	return value instanceof Panic;
};
/**
* Throw an unrecoverable Panic.
*
* @example
* panic("something went wrong", cause);
*/
const panic = (message, cause) => {
	throw new Panic({
		message,
		cause
	});
};

//#endregion
//#region src/result.ts
/** Executes fn, panics if it throws. */
const tryOrPanic = (fn, message) => {
	try {
		return fn();
	} catch (cause) {
		throw panic(message, cause);
	}
};
/** Async version of tryOrPanic. */
const tryOrPanicAsync = async (fn, message) => {
	try {
		return await fn();
	} catch (cause) {
		throw panic(message, cause);
	}
};
/**
* Successful result variant.
*
* @template A Success value type.
* @template E Error type (phantom - for type unification).
*
* @example
* const result = new Ok(42);
* result.value // 42
* result.status // "ok"
*/
var Ok = class Ok {
	status = "ok";
	constructor(value) {
		this.value = value;
	}
	/** Returns true, narrowing Result to Ok. */
	isOk() {
		return true;
	}
	/** Returns false, narrowing Result to Err. */
	isErr() {
		return false;
	}
	/**
	* Transforms success value.
	*
	* @template B Transformed type.
	* @param fn Transformation function.
	* @returns Ok with transformed value.
	* @throws {Panic} If fn throws.
	*
	* @example
	* ok(2).map(x => x * 2) // Ok(4)
	*/
	map(fn) {
		return tryOrPanic(() => new Ok(fn(this.value)), "map callback threw");
	}
	/**
	* No-op on Ok, returns self with new phantom error type.
	*
	* @template E2 New error type.
	* @param _fn Ignored.
	* @returns Self with updated phantom E type.
	*/
	mapError(_fn) {
		return this;
	}
	/**
	* Chains Result-returning function.
	*
	* @template B New success type.
	* @template E2 New error type.
	* @param fn Function returning Result.
	* @returns Result from fn.
	* @throws {Panic} If fn throws.
	*
	* @example
	* ok(2).andThen(x => x > 0 ? ok(x) : err("negative")) // Ok(2)
	*/
	andThen(fn) {
		return tryOrPanic(() => fn(this.value), "andThen callback threw");
	}
	/**
	* Chains async Result-returning function.
	*
	* @template B New success type.
	* @template E2 New error type.
	* @param fn Async function returning Result.
	* @returns Promise of Result from fn.
	* @throws {Panic} If fn throws synchronously or rejects.
	*
	* @example
	* await ok(1).andThenAsync(async x => ok(await fetchData(x)))
	*/
	andThenAsync(fn) {
		return tryOrPanicAsync(() => fn(this.value), "andThenAsync callback threw");
	}
	/**
	* Pattern matches on Result.
	*
	* @template T Return type.
	* @param handlers Ok and err handlers.
	* @returns Result of ok handler.
	* @throws {Panic} If handler throws.
	*
	* @example
	* ok(2).match({ ok: x => x * 2, err: () => 0 }) // 4
	*/
	match(handlers) {
		return tryOrPanic(() => handlers.ok(this.value), "match ok handler threw");
	}
	/**
	* Extracts value.
	*
	* @param _message Ignored.
	* @returns The value.
	*
	* @example
	* ok(42).unwrap() // 42
	*/
	unwrap(_message) {
		return this.value;
	}
	/**
	* Returns value, ignoring fallback.
	*
	* @template B Fallback type.
	* @param _fallback Ignored.
	* @returns The value.
	*
	* @example
	* ok(42).unwrapOr(0) // 42
	*/
	unwrapOr(_fallback) {
		return this.value;
	}
	/**
	* Runs side effect, returns self.
	*
	* @param fn Side effect function.
	* @returns Self.
	* @throws {Panic} If fn throws.
	*
	* @example
	* ok(2).tap(console.log).map(x => x * 2) // logs 2, returns Ok(4)
	*/
	tap(fn) {
		return tryOrPanic(() => {
			fn(this.value);
			return this;
		}, "tap callback threw");
	}
	/**
	* Runs async side effect, returns self.
	*
	* @param fn Async side effect function.
	* @returns Promise of self.
	* @throws {Panic} If fn throws synchronously or rejects.
	*
	* @example
	* await ok(2).tapAsync(async x => await log(x))
	*/
	tapAsync(fn) {
		return tryOrPanicAsync(async () => {
			await fn(this.value);
			return this;
		}, "tapAsync callback threw");
	}
	/**
	* Makes Ok yieldable in Result.gen blocks.
	* Immediately returns the value without yielding.
	* Yield type Err<never, E> matches Err's for proper union inference.
	*/
	*[Symbol.iterator]() {
		return this.value;
	}
};
/**
* Error result variant.
*
* @template T Success type (phantom - for type unification with Ok).
* @template E Error value type.
*
* @example
* const result = new Err("failed");
* result.error // "failed"
* result.status // "error"
*/
var Err = class Err {
	status = "error";
	constructor(error) {
		this.error = error;
	}
	/** Returns false, narrowing Result to Ok. */
	isOk() {
		return false;
	}
	/** Returns true, narrowing Result to Err. */
	isErr() {
		return true;
	}
	/**
	* No-op on Err, returns self with new phantom T.
	*
	* @template U New phantom success type.
	* @param _fn Ignored.
	* @returns Self.
	*/
	map(_fn) {
		return this;
	}
	/**
	* Transforms error value.
	*
	* @template E2 Transformed error type.
	* @param fn Transformation function.
	* @returns Err with transformed error.
	* @throws {Panic} If fn throws.
	*
	* @example
	* err("fail").mapError(e => new Error(e)) // Err(Error("fail"))
	*/
	mapError(fn) {
		return tryOrPanic(() => new Err(fn(this.error)), "mapError callback threw");
	}
	/**
	* No-op on Err, returns self with widened error type.
	*
	* @template U New phantom success type.
	* @template E2 Additional error type.
	* @param _fn Ignored.
	* @returns Self.
	*/
	andThen(_fn) {
		return this;
	}
	/**
	* No-op on Err, returns Promise of self with widened error type.
	*
	* @template U New phantom success type.
	* @template E2 Additional error type.
	* @param _fn Ignored.
	* @returns Promise of self.
	*/
	andThenAsync(_fn) {
		return Promise.resolve(this);
	}
	/**
	* Pattern matches on Result.
	*
	* @template R Return type.
	* @param handlers Ok and err handlers.
	* @returns Result of err handler.
	* @throws {Panic} If handler throws.
	*
	* @example
	* err("fail").match({ ok: x => x, err: e => e.length }) // 4
	*/
	match(handlers) {
		return tryOrPanic(() => handlers.err(this.error), "match err handler threw");
	}
	/**
	* Throws error with optional message.
	*
	* @param message Error message.
	* @throws Always throws.
	*
	* @example
	* err("fail").unwrap() // throws Error
	* err("fail").unwrap("custom") // throws Error("custom")
	*/
	unwrap(message) {
		return panic(message ?? `Unwrap called on Err: ${String(this.error)}`, this.error);
	}
	/**
	* Returns fallback value.
	*
	* @template U Fallback type.
	* @param fallback Fallback value.
	* @returns Fallback.
	*
	* @example
	* err("fail").unwrapOr(42) // 42
	*/
	unwrapOr(fallback) {
		return fallback;
	}
	/**
	* No-op on Err, returns self.
	*
	* @param _fn Ignored.
	* @returns Self.
	*/
	tap(_fn) {
		return this;
	}
	/**
	* No-op on Err, returns Promise of self.
	*
	* @param _fn Ignored.
	* @returns Promise of self.
	*/
	tapAsync(_fn) {
		return Promise.resolve(this);
	}
	/**
	* Makes Err yieldable in Result.gen blocks.
	* Yields Err<never, E> for proper union inference across multiple yields.
	*/
	*[Symbol.iterator]() {
		yield this;
		return panic("Unreachable: Err yielded in Result.gen but generator continued", this.error);
	}
};
function ok(value) {
	return new Ok(value);
}
const isOk = (result) => {
	return result.status === "ok";
};
const err = (error) => new Err(error);
const isError = (result) => {
	return result.status === "error";
};
const tryFn = (options, config) => {
	const execute = () => {
		if (typeof options === "function") try {
			return ok(options());
		} catch (cause) {
			return err(new UnhandledException({ cause }));
		}
		try {
			return ok(options.try());
		} catch (originalCause) {
			try {
				return err(options.catch(originalCause));
			} catch (catchHandlerError) {
				throw panic("Result.try catch handler threw", catchHandlerError);
			}
		}
	};
	const times = config?.retry?.times ?? 0;
	let result = execute();
	for (let retry = 0; retry < times && result.status === "error"; retry++) result = execute();
	return result;
};
const tryPromise = async (options, config) => {
	const execute = async () => {
		if (typeof options === "function") try {
			return ok(await options());
		} catch (cause) {
			return err(new UnhandledException({ cause }));
		}
		try {
			return ok(await options.try());
		} catch (originalCause) {
			try {
				return err(await options.catch(originalCause));
			} catch (catchHandlerError) {
				throw panic("Result.tryPromise catch handler threw", catchHandlerError);
			}
		}
	};
	const retry = config?.retry;
	if (!retry) return execute();
	const getDelay = (retryAttempt) => {
		switch (retry.backoff) {
			case "constant": return retry.delayMs;
			case "linear": return retry.delayMs * (retryAttempt + 1);
			case "exponential": return retry.delayMs * 2 ** retryAttempt;
		}
	};
	const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
	let result = await execute();
	const shouldRetryFn = retry.shouldRetry ?? (() => true);
	for (let attempt = 0; attempt < retry.times; attempt++) {
		if (result.status !== "error") break;
		const error = result.error;
		if (!tryOrPanic(() => shouldRetryFn(error), "shouldRetry predicate threw")) break;
		await sleep(getDelay(attempt));
		result = await execute();
	}
	return result;
};
const map = dual(2, (result, fn) => {
	return result.map(fn);
});
const mapError = dual(2, (result, fn) => {
	return result.mapError(fn);
});
const andThen = dual(2, (result, fn) => {
	return result.andThen(fn);
});
const andThenAsync = dual(2, (result, fn) => {
	return result.andThenAsync(fn);
});
const match = dual(2, (result, handlers) => {
	return result.match(handlers);
});
const tap = dual(2, (result, fn) => {
	return result.tap(fn);
});
const tapAsync = dual(2, (result, fn) => {
	return result.tapAsync(fn);
});
const unwrap = (result, message) => {
	return result.unwrap(message);
};
/** Validates that a value is a Result instance. Throws with helpful message if not. */
function assertIsResult(value) {
	if (value !== null && typeof value === "object" && "status" in value && (value.status === "ok" || value.status === "error")) return;
	return panic("Result.gen body must return Result.ok() or Result.err(), got: " + (value === null ? "null" : typeof value === "object" ? JSON.stringify(value) : String(value)));
}
const unwrapOr = dual(2, (result, fallback) => {
	return result.unwrapOr(fallback);
});
const gen = ((body, thisArg) => {
	const iterator = body.call(thisArg);
	if (Symbol.asyncIterator in iterator) return (async () => {
		const asyncIter = iterator;
		let state$1;
		try {
			state$1 = await asyncIter.next();
		} catch (cause) {
			throw panic("generator body threw", cause);
		}
		assertIsResult(state$1.value);
		if (!state$1.done) try {
			await asyncIter.return?.(void 0);
		} catch (cause) {
			throw panic("generator cleanup threw", cause);
		}
		return state$1.value;
	})();
	const syncIter = iterator;
	let state;
	try {
		state = syncIter.next();
	} catch (cause) {
		throw panic("generator body threw", cause);
	}
	assertIsResult(state.value);
	if (!state.done) try {
		syncIter.return?.(void 0);
	} catch (cause) {
		throw panic("generator cleanup threw", cause);
	}
	return state.value;
});
async function* resultAwait(promise) {
	return yield* await promise;
}
function isSerializedResult(obj) {
	return obj !== null && typeof obj === "object" && "status" in obj && (obj.status === "ok" && "value" in obj || obj.status === "error" && "error" in obj);
}
const serialize = (result) => {
	return result.status === "ok" ? {
		status: "ok",
		value: result.value
	} : {
		status: "error",
		error: result.error
	};
};
const deserialize = (value) => {
	if (isSerializedResult(value)) return value.status === "ok" ? new Ok(value.value) : new Err(value.error);
	return err(new ResultDeserializationError({ value }));
};
/**
* @deprecated Use `Result.deserialize` instead. Will be removed in 3.0.
*/
const hydrate = (value) => {
	return deserialize(value);
};
const partition = (results) => {
	const oks = [];
	const errs = [];
	for (const r of results) if (r.status === "ok") oks.push(r.value);
	else errs.push(r.error);
	return [oks, errs];
};
/**
* Flattens nested Result into single Result.
*
* @example
* const nested: Result<Result<number, E1>, E2> = Result.ok(Result.ok(42));
* const flat: Result<number, E1 | E2> = Result.flatten(nested); // Ok(42)
*/
const flatten = (result) => {
	if (result.status === "ok") return result.value;
	return result;
};
/**
* Utilities for creating and handling Result types.
*
* @example
* const result = Result.try(() => JSON.parse(str));
* const value = result.map(x => x.id).unwrapOr("default");
*/
const Result = {
	ok,
	isOk,
	err,
	isError,
	try: tryFn,
	tryPromise,
	map,
	mapError,
	andThen,
	andThenAsync,
	match,
	tap,
	tapAsync,
	unwrap,
	unwrapOr,
	gen,
	await: resultAwait,
	serialize,
	deserialize,
	hydrate,
	partition,
	flatten
};

//#endregion
export { Err, Ok, Panic, Result, ResultDeserializationError, TaggedError, UnhandledException, isPanic, isTaggedError, matchError, matchErrorPartial, panic };
//# sourceMappingURL=index.mjs.map