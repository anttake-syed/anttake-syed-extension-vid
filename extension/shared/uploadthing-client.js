// node_modules/uploadthing/dist/package-DpScpvTA.js
var version = "7.7.4";

// node_modules/effect/dist/esm/Function.js
var isFunction = (input) => typeof input === "function";
var dual = function(arity, body) {
  if (typeof arity === "function") {
    return function() {
      if (arity(arguments)) {
        return body.apply(this, arguments);
      }
      return (self) => body(self, ...arguments);
    };
  }
  switch (arity) {
    case 0:
    case 1:
      throw new RangeError(`Invalid arity ${arity}`);
    case 2:
      return function(a, b) {
        if (arguments.length >= 2) {
          return body(a, b);
        }
        return function(self) {
          return body(self, a);
        };
      };
    case 3:
      return function(a, b, c) {
        if (arguments.length >= 3) {
          return body(a, b, c);
        }
        return function(self) {
          return body(self, a, b);
        };
      };
    case 4:
      return function(a, b, c, d) {
        if (arguments.length >= 4) {
          return body(a, b, c, d);
        }
        return function(self) {
          return body(self, a, b, c);
        };
      };
    case 5:
      return function(a, b, c, d, e) {
        if (arguments.length >= 5) {
          return body(a, b, c, d, e);
        }
        return function(self) {
          return body(self, a, b, c, d);
        };
      };
    default:
      return function() {
        if (arguments.length >= arity) {
          return body.apply(this, arguments);
        }
        const args2 = arguments;
        return function(self) {
          return body(self, ...args2);
        };
      };
  }
};
var identity = (a) => a;
var unsafeCoerce = identity;
var constant = (value) => () => value;
var constUndefined = /* @__PURE__ */ constant(void 0);
var constVoid = constUndefined;
function pipe(a, ab, bc, cd, de, ef, fg, gh, hi) {
  switch (arguments.length) {
    case 1:
      return a;
    case 2:
      return ab(a);
    case 3:
      return bc(ab(a));
    case 4:
      return cd(bc(ab(a)));
    case 5:
      return de(cd(bc(ab(a))));
    case 6:
      return ef(de(cd(bc(ab(a)))));
    case 7:
      return fg(ef(de(cd(bc(ab(a))))));
    case 8:
      return gh(fg(ef(de(cd(bc(ab(a)))))));
    case 9:
      return hi(gh(fg(ef(de(cd(bc(ab(a))))))));
    default: {
      let ret = arguments[0];
      for (let i = 1; i < arguments.length; i++) {
        ret = arguments[i](ret);
      }
      return ret;
    }
  }
}

// node_modules/effect/dist/esm/GlobalValue.js
var globalStoreId = `effect/GlobalValue`;
var globalStore;
var globalValue = (id, compute) => {
  if (!globalStore) {
    globalThis[globalStoreId] ??= /* @__PURE__ */ new Map();
    globalStore = globalThis[globalStoreId];
  }
  if (!globalStore.has(id)) {
    globalStore.set(id, compute());
  }
  return globalStore.get(id);
};

// node_modules/effect/dist/esm/Predicate.js
var isString = (input) => typeof input === "string";
var isNumber = (input) => typeof input === "number";
var isFunction2 = isFunction;
var isRecordOrArray = (input) => typeof input === "object" && input !== null;
var isObject = (input) => isRecordOrArray(input) || isFunction2(input);
var hasProperty = /* @__PURE__ */ dual(2, (self, property) => isObject(self) && property in self);
var isTagged = /* @__PURE__ */ dual(2, (self, tag) => hasProperty(self, "_tag") && self["_tag"] === tag);
var isRecord = (input) => isRecordOrArray(input) && !Array.isArray(input);

// node_modules/effect/dist/esm/internal/errors.js
var getBugErrorMessage = (message) => `BUG: ${message} - please report an issue at https://github.com/Effect-TS/effect/issues`;

// node_modules/effect/dist/esm/Utils.js
var GenKindTypeId = /* @__PURE__ */ Symbol.for("effect/Gen/GenKind");
var GenKindImpl = class {
  value;
  constructor(value) {
    this.value = value;
  }
  /**
   * @since 2.0.0
   */
  get _F() {
    return identity;
  }
  /**
   * @since 2.0.0
   */
  get _R() {
    return (_) => _;
  }
  /**
   * @since 2.0.0
   */
  get _O() {
    return (_) => _;
  }
  /**
   * @since 2.0.0
   */
  get _E() {
    return (_) => _;
  }
  /**
   * @since 2.0.0
   */
  [GenKindTypeId] = GenKindTypeId;
  /**
   * @since 2.0.0
   */
  [Symbol.iterator]() {
    return new SingleShotGen(this);
  }
};
var SingleShotGen = class _SingleShotGen {
  self;
  called = false;
  constructor(self) {
    this.self = self;
  }
  /**
   * @since 2.0.0
   */
  next(a) {
    return this.called ? {
      value: a,
      done: true
    } : (this.called = true, {
      value: this.self,
      done: false
    });
  }
  /**
   * @since 2.0.0
   */
  return(a) {
    return {
      value: a,
      done: true
    };
  }
  /**
   * @since 2.0.0
   */
  throw(e) {
    throw e;
  }
  /**
   * @since 2.0.0
   */
  [Symbol.iterator]() {
    return new _SingleShotGen(this.self);
  }
};
var MUL_HI = 1481765933 >>> 0;
var MUL_LO = 1284865837 >>> 0;
var YieldWrapTypeId = /* @__PURE__ */ Symbol.for("effect/Utils/YieldWrap");
var YieldWrap = class {
  /**
   * @since 3.0.6
   */
  #value;
  constructor(value) {
    this.#value = value;
  }
  /**
   * @since 3.0.6
   */
  [YieldWrapTypeId]() {
    return this.#value;
  }
};
function yieldWrapGet(self) {
  if (typeof self === "object" && self !== null && YieldWrapTypeId in self) {
    return self[YieldWrapTypeId]();
  }
  throw new Error(getBugErrorMessage("yieldWrapGet"));
}
var structuralRegionState = /* @__PURE__ */ globalValue("effect/Utils/isStructuralRegion", () => ({
  enabled: false,
  tester: void 0
}));
var standard = {
  effect_internal_function: (body) => {
    return body();
  }
};
var forced = {
  effect_internal_function: (body) => {
    try {
      return body();
    } finally {
    }
  }
};
var isNotOptimizedAway = /* @__PURE__ */ standard.effect_internal_function(() => new Error().stack)?.includes("effect_internal_function") === true;
var internalCall = isNotOptimizedAway ? standard.effect_internal_function : forced.effect_internal_function;
var genConstructor = function* () {
}.constructor;

// node_modules/effect/dist/esm/Hash.js
var randomHashCache = /* @__PURE__ */ globalValue(/* @__PURE__ */ Symbol.for("effect/Hash/randomHashCache"), () => /* @__PURE__ */ new WeakMap());
var symbol = /* @__PURE__ */ Symbol.for("effect/Hash");
var hash = (self) => {
  if (structuralRegionState.enabled === true) {
    return 0;
  }
  switch (typeof self) {
    case "number":
      return number(self);
    case "bigint":
      return string(self.toString(10));
    case "boolean":
      return string(String(self));
    case "symbol":
      return string(String(self));
    case "string":
      return string(self);
    case "undefined":
      return string("undefined");
    case "function":
    case "object": {
      if (self === null) {
        return string("null");
      } else if (self instanceof Date) {
        return hash(self.toISOString());
      } else if (self instanceof URL) {
        return hash(self.href);
      } else if (isHash(self)) {
        return self[symbol]();
      } else {
        return random(self);
      }
    }
    default:
      throw new Error(`BUG: unhandled typeof ${typeof self} - please report an issue at https://github.com/Effect-TS/effect/issues`);
  }
};
var random = (self) => {
  if (!randomHashCache.has(self)) {
    randomHashCache.set(self, number(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)));
  }
  return randomHashCache.get(self);
};
var combine = (b) => (self) => self * 53 ^ b;
var optimize = (n) => n & 3221225471 | n >>> 1 & 1073741824;
var isHash = (u) => hasProperty(u, symbol);
var number = (n) => {
  if (n !== n || n === Infinity) {
    return 0;
  }
  let h = n | 0;
  if (h !== n) {
    h ^= n * 4294967295;
  }
  while (n > 4294967295) {
    h ^= n /= 4294967295;
  }
  return optimize(h);
};
var string = (str) => {
  let h = 5381, i = str.length;
  while (i) {
    h = h * 33 ^ str.charCodeAt(--i);
  }
  return optimize(h);
};
var structureKeys = (o, keys) => {
  let h = 12289;
  for (let i = 0; i < keys.length; i++) {
    h ^= pipe(string(keys[i]), combine(hash(o[keys[i]])));
  }
  return optimize(h);
};
var structure = (o) => structureKeys(o, Object.keys(o));
var cached = function() {
  if (arguments.length === 1) {
    const self2 = arguments[0];
    return function(hash3) {
      Object.defineProperty(self2, symbol, {
        value() {
          return hash3;
        },
        enumerable: false
      });
      return hash3;
    };
  }
  const self = arguments[0];
  const hash2 = arguments[1];
  Object.defineProperty(self, symbol, {
    value() {
      return hash2;
    },
    enumerable: false
  });
  return hash2;
};

// node_modules/effect/dist/esm/Equal.js
var symbol2 = /* @__PURE__ */ Symbol.for("effect/Equal");
function equals() {
  if (arguments.length === 1) {
    return (self) => compareBoth(self, arguments[0]);
  }
  return compareBoth(arguments[0], arguments[1]);
}
function compareBoth(self, that) {
  if (self === that) {
    return true;
  }
  const selfType = typeof self;
  if (selfType !== typeof that) {
    return false;
  }
  if (selfType === "object" || selfType === "function") {
    if (self !== null && that !== null) {
      if (isEqual(self) && isEqual(that)) {
        if (hash(self) === hash(that) && self[symbol2](that)) {
          return true;
        } else {
          return structuralRegionState.enabled && structuralRegionState.tester ? structuralRegionState.tester(self, that) : false;
        }
      } else if (self instanceof Date && that instanceof Date) {
        return self.toISOString() === that.toISOString();
      } else if (self instanceof URL && that instanceof URL) {
        return self.href === that.href;
      }
    }
    if (structuralRegionState.enabled) {
      if (Array.isArray(self) && Array.isArray(that)) {
        return self.length === that.length && self.every((v, i) => compareBoth(v, that[i]));
      }
      if (Object.getPrototypeOf(self) === Object.prototype && Object.getPrototypeOf(self) === Object.prototype) {
        const keysSelf = Object.keys(self);
        const keysThat = Object.keys(that);
        if (keysSelf.length === keysThat.length) {
          for (const key of keysSelf) {
            if (!(key in that && compareBoth(self[key], that[key]))) {
              return structuralRegionState.tester ? structuralRegionState.tester(self, that) : false;
            }
          }
          return true;
        }
      }
      return structuralRegionState.tester ? structuralRegionState.tester(self, that) : false;
    }
  }
  return structuralRegionState.enabled && structuralRegionState.tester ? structuralRegionState.tester(self, that) : false;
}
var isEqual = (u) => hasProperty(u, symbol2);

// node_modules/effect/dist/esm/Inspectable.js
var NodeInspectSymbol = /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom");
var toJSON = (x) => {
  try {
    if (hasProperty(x, "toJSON") && isFunction2(x["toJSON"]) && x["toJSON"].length === 0) {
      return x.toJSON();
    } else if (Array.isArray(x)) {
      return x.map(toJSON);
    }
  } catch {
    return {};
  }
  return redact(x);
};
var format = (x) => JSON.stringify(x, null, 2);
var BaseProto = {
  toJSON() {
    return toJSON(this);
  },
  [NodeInspectSymbol]() {
    return this.toJSON();
  },
  toString() {
    return format(this.toJSON());
  }
};
var Class = class {
  /**
   * @since 2.0.0
   */
  [NodeInspectSymbol]() {
    return this.toJSON();
  }
  /**
   * @since 2.0.0
   */
  toString() {
    return format(this.toJSON());
  }
};
var toStringUnknown = (u, whitespace = 2) => {
  if (typeof u === "string") {
    return u;
  }
  try {
    return typeof u === "object" ? stringifyCircular(u, whitespace) : String(u);
  } catch {
    return String(u);
  }
};
var stringifyCircular = (obj, whitespace) => {
  let cache = [];
  const retVal = JSON.stringify(obj, (_key, value) => typeof value === "object" && value !== null ? cache.includes(value) ? void 0 : cache.push(value) && (redactableState.fiberRefs !== void 0 && isRedactable(value) ? value[symbolRedactable](redactableState.fiberRefs) : value) : value, whitespace);
  cache = void 0;
  return retVal;
};
var symbolRedactable = /* @__PURE__ */ Symbol.for("effect/Inspectable/Redactable");
var isRedactable = (u) => typeof u === "object" && u !== null && symbolRedactable in u;
var redactableState = /* @__PURE__ */ globalValue("effect/Inspectable/redactableState", () => ({
  fiberRefs: void 0
}));
var redact = (u) => {
  if (isRedactable(u) && redactableState.fiberRefs !== void 0) {
    return u[symbolRedactable](redactableState.fiberRefs);
  }
  return u;
};

// node_modules/effect/dist/esm/Pipeable.js
var pipeArguments = (self, args2) => {
  switch (args2.length) {
    case 0:
      return self;
    case 1:
      return args2[0](self);
    case 2:
      return args2[1](args2[0](self));
    case 3:
      return args2[2](args2[1](args2[0](self)));
    case 4:
      return args2[3](args2[2](args2[1](args2[0](self))));
    case 5:
      return args2[4](args2[3](args2[2](args2[1](args2[0](self)))));
    case 6:
      return args2[5](args2[4](args2[3](args2[2](args2[1](args2[0](self))))));
    case 7:
      return args2[6](args2[5](args2[4](args2[3](args2[2](args2[1](args2[0](self)))))));
    case 8:
      return args2[7](args2[6](args2[5](args2[4](args2[3](args2[2](args2[1](args2[0](self))))))));
    case 9:
      return args2[8](args2[7](args2[6](args2[5](args2[4](args2[3](args2[2](args2[1](args2[0](self)))))))));
    default: {
      let ret = self;
      for (let i = 0, len = args2.length; i < len; i++) {
        ret = args2[i](ret);
      }
      return ret;
    }
  }
};

// node_modules/effect/dist/esm/internal/opCodes/effect.js
var OP_COMMIT = "Commit";

// node_modules/effect/dist/esm/internal/version.js
var moduleVersion = "3.17.7";
var getCurrentVersion = () => moduleVersion;

// node_modules/effect/dist/esm/internal/effectable.js
var EffectTypeId = /* @__PURE__ */ Symbol.for("effect/Effect");
var StreamTypeId = /* @__PURE__ */ Symbol.for("effect/Stream");
var SinkTypeId = /* @__PURE__ */ Symbol.for("effect/Sink");
var ChannelTypeId = /* @__PURE__ */ Symbol.for("effect/Channel");
var effectVariance = {
  /* c8 ignore next */
  _R: (_) => _,
  /* c8 ignore next */
  _E: (_) => _,
  /* c8 ignore next */
  _A: (_) => _,
  _V: /* @__PURE__ */ getCurrentVersion()
};
var sinkVariance = {
  /* c8 ignore next */
  _A: (_) => _,
  /* c8 ignore next */
  _In: (_) => _,
  /* c8 ignore next */
  _L: (_) => _,
  /* c8 ignore next */
  _E: (_) => _,
  /* c8 ignore next */
  _R: (_) => _
};
var channelVariance = {
  /* c8 ignore next */
  _Env: (_) => _,
  /* c8 ignore next */
  _InErr: (_) => _,
  /* c8 ignore next */
  _InElem: (_) => _,
  /* c8 ignore next */
  _InDone: (_) => _,
  /* c8 ignore next */
  _OutErr: (_) => _,
  /* c8 ignore next */
  _OutElem: (_) => _,
  /* c8 ignore next */
  _OutDone: (_) => _
};
var EffectPrototype = {
  [EffectTypeId]: effectVariance,
  [StreamTypeId]: effectVariance,
  [SinkTypeId]: sinkVariance,
  [ChannelTypeId]: channelVariance,
  [symbol2](that) {
    return this === that;
  },
  [symbol]() {
    return cached(this, random(this));
  },
  [Symbol.iterator]() {
    return new SingleShotGen(new YieldWrap(this));
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
var StructuralPrototype = {
  [symbol]() {
    return cached(this, structure(this));
  },
  [symbol2](that) {
    const selfKeys = Object.keys(this);
    const thatKeys = Object.keys(that);
    if (selfKeys.length !== thatKeys.length) {
      return false;
    }
    for (const key of selfKeys) {
      if (!(key in that && equals(this[key], that[key]))) {
        return false;
      }
    }
    return true;
  }
};
var CommitPrototype = {
  ...EffectPrototype,
  _op: OP_COMMIT
};
var StructuralCommitPrototype = {
  ...CommitPrototype,
  ...StructuralPrototype
};

// node_modules/effect/dist/esm/Array.js
var fromIterable = (collection) => Array.isArray(collection) ? collection : Array.from(collection);
var ensure = (self) => Array.isArray(self) ? self : [self];

// node_modules/effect/dist/esm/internal/context.js
var TagTypeId = /* @__PURE__ */ Symbol.for("effect/Context/Tag");
var ReferenceTypeId = /* @__PURE__ */ Symbol.for("effect/Context/Reference");
var STMSymbolKey = "effect/STM";
var STMTypeId = /* @__PURE__ */ Symbol.for(STMSymbolKey);
var TagProto = {
  ...EffectPrototype,
  _op: "Tag",
  [STMTypeId]: effectVariance,
  [TagTypeId]: {
    _Service: (_) => _,
    _Identifier: (_) => _
  },
  toString() {
    return format(this.toJSON());
  },
  toJSON() {
    return {
      _id: "Tag",
      key: this.key,
      stack: this.stack
    };
  },
  [NodeInspectSymbol]() {
    return this.toJSON();
  },
  of(self) {
    return self;
  },
  context(self) {
    return make(this, self);
  }
};
var ReferenceProto = {
  ...TagProto,
  [ReferenceTypeId]: ReferenceTypeId
};
var Tag = (id) => () => {
  const limit = Error.stackTraceLimit;
  Error.stackTraceLimit = 2;
  const creationError = new Error();
  Error.stackTraceLimit = limit;
  function TagClass() {
  }
  Object.setPrototypeOf(TagClass, TagProto);
  TagClass.key = id;
  Object.defineProperty(TagClass, "stack", {
    get() {
      return creationError.stack;
    }
  });
  return TagClass;
};
var Reference = () => (id, options) => {
  const limit = Error.stackTraceLimit;
  Error.stackTraceLimit = 2;
  const creationError = new Error();
  Error.stackTraceLimit = limit;
  function ReferenceClass() {
  }
  Object.setPrototypeOf(ReferenceClass, ReferenceProto);
  ReferenceClass.key = id;
  ReferenceClass.defaultValue = options.defaultValue;
  Object.defineProperty(ReferenceClass, "stack", {
    get() {
      return creationError.stack;
    }
  });
  return ReferenceClass;
};
var TypeId = /* @__PURE__ */ Symbol.for("effect/Context");
var ContextProto = {
  [TypeId]: {
    _Services: (_) => _
  },
  [symbol2](that) {
    if (isContext(that)) {
      if (this.unsafeMap.size === that.unsafeMap.size) {
        for (const k of this.unsafeMap.keys()) {
          if (!that.unsafeMap.has(k) || !equals(this.unsafeMap.get(k), that.unsafeMap.get(k))) {
            return false;
          }
        }
        return true;
      }
    }
    return false;
  },
  [symbol]() {
    return cached(this, number(this.unsafeMap.size));
  },
  pipe() {
    return pipeArguments(this, arguments);
  },
  toString() {
    return format(this.toJSON());
  },
  toJSON() {
    return {
      _id: "Context",
      services: Array.from(this.unsafeMap).map(toJSON)
    };
  },
  [NodeInspectSymbol]() {
    return this.toJSON();
  }
};
var makeContext = (unsafeMap) => {
  const context = Object.create(ContextProto);
  context.unsafeMap = unsafeMap;
  return context;
};
var serviceNotFoundError = (tag) => {
  const error = new Error(`Service not found${tag.key ? `: ${String(tag.key)}` : ""}`);
  if (tag.stack) {
    const lines = tag.stack.split("\n");
    if (lines.length > 2) {
      const afterAt = lines[2].match(/at (.*)/);
      if (afterAt) {
        error.message = error.message + ` (defined at ${afterAt[1]})`;
      }
    }
  }
  if (error.stack) {
    const lines = error.stack.split("\n");
    lines.splice(1, 3);
    error.stack = lines.join("\n");
  }
  return error;
};
var isContext = (u) => hasProperty(u, TypeId);
var make = (tag, service2) => makeContext(/* @__PURE__ */ new Map([[tag.key, service2]]));
var add = /* @__PURE__ */ dual(3, (self, tag, service2) => {
  const map2 = new Map(self.unsafeMap);
  map2.set(tag.key, service2);
  return makeContext(map2);
});
var defaultValueCache = /* @__PURE__ */ globalValue("effect/Context/defaultValueCache", () => /* @__PURE__ */ new Map());
var getDefaultValue = (tag) => {
  if (defaultValueCache.has(tag.key)) {
    return defaultValueCache.get(tag.key);
  }
  const value = tag.defaultValue();
  defaultValueCache.set(tag.key, value);
  return value;
};
var unsafeGetReference = (self, tag) => {
  return self.unsafeMap.has(tag.key) ? self.unsafeMap.get(tag.key) : getDefaultValue(tag);
};
var unsafeGet = /* @__PURE__ */ dual(2, (self, tag) => {
  if (!self.unsafeMap.has(tag.key)) {
    if (ReferenceTypeId in tag) return getDefaultValue(tag);
    throw serviceNotFoundError(tag);
  }
  return self.unsafeMap.get(tag.key);
});

// node_modules/effect/dist/esm/Context.js
var add2 = add;
var unsafeGet2 = unsafeGet;
var Tag2 = Tag;
var Reference2 = Reference;

// node_modules/effect/dist/esm/Effectable.js
var EffectPrototype2 = EffectPrototype;

// node_modules/effect/dist/esm/Micro.js
var TypeId2 = /* @__PURE__ */ Symbol.for("effect/Micro");
var MicroExitTypeId = /* @__PURE__ */ Symbol.for("effect/Micro/MicroExit");
var isMicro = (u) => typeof u === "object" && u !== null && TypeId2 in u;
var MicroCauseTypeId = /* @__PURE__ */ Symbol.for("effect/Micro/MicroCause");
var microCauseVariance = {
  _E: identity
};
var MicroCauseImpl = class extends globalThis.Error {
  _tag;
  traces;
  [MicroCauseTypeId];
  constructor(_tag, originalError, traces) {
    const causeName = `MicroCause.${_tag}`;
    let name;
    let message;
    let stack;
    if (originalError instanceof globalThis.Error) {
      name = `(${causeName}) ${originalError.name}`;
      message = originalError.message;
      const messageLines = message.split("\n").length;
      stack = originalError.stack ? `(${causeName}) ${originalError.stack.split("\n").slice(0, messageLines + 3).join("\n")}` : `${name}: ${message}`;
    } else {
      name = causeName;
      message = toStringUnknown(originalError, 0);
      stack = `${name}: ${message}`;
    }
    if (traces.length > 0) {
      stack += `
    ${traces.join("\n    ")}`;
    }
    super(message);
    this._tag = _tag;
    this.traces = traces;
    this[MicroCauseTypeId] = microCauseVariance;
    this.name = name;
    this.stack = stack;
  }
  pipe() {
    return pipeArguments(this, arguments);
  }
  toString() {
    return this.stack;
  }
  [NodeInspectSymbol]() {
    return this.stack;
  }
};
var Fail = class extends MicroCauseImpl {
  error;
  constructor(error, traces = []) {
    super("Fail", error, traces);
    this.error = error;
  }
};
var causeFail = (error, traces = []) => new Fail(error, traces);
var Die = class extends MicroCauseImpl {
  defect;
  constructor(defect, traces = []) {
    super("Die", defect, traces);
    this.defect = defect;
  }
};
var causeDie = (defect, traces = []) => new Die(defect, traces);
var Interrupt = class extends MicroCauseImpl {
  constructor(traces = []) {
    super("Interrupt", "interrupted", traces);
  }
};
var causeInterrupt = (traces = []) => new Interrupt(traces);
var causeIsFail = (self) => self._tag === "Fail";
var causeIsInterrupt = (self) => self._tag === "Interrupt";
var causeSquash = (self) => self._tag === "Fail" ? self.error : self._tag === "Die" ? self.defect : self;
var causeWithTrace = /* @__PURE__ */ dual(2, (self, trace) => {
  const traces = [...self.traces, trace];
  switch (self._tag) {
    case "Die":
      return causeDie(self.defect, traces);
    case "Interrupt":
      return causeInterrupt(traces);
    case "Fail":
      return causeFail(self.error, traces);
  }
});
var MicroFiberTypeId = /* @__PURE__ */ Symbol.for("effect/Micro/MicroFiber");
var fiberVariance = {
  _A: identity,
  _E: identity
};
var MicroFiberImpl = class {
  context;
  interruptible;
  [MicroFiberTypeId];
  _stack = [];
  _observers = [];
  _exit;
  _children;
  currentOpCount = 0;
  constructor(context, interruptible2 = true) {
    this.context = context;
    this.interruptible = interruptible2;
    this[MicroFiberTypeId] = fiberVariance;
  }
  getRef(ref) {
    return unsafeGetReference(this.context, ref);
  }
  addObserver(cb) {
    if (this._exit) {
      cb(this._exit);
      return constVoid;
    }
    this._observers.push(cb);
    return () => {
      const index = this._observers.indexOf(cb);
      if (index >= 0) {
        this._observers.splice(index, 1);
      }
    };
  }
  _interrupted = false;
  unsafeInterrupt() {
    if (this._exit) {
      return;
    }
    this._interrupted = true;
    if (this.interruptible) {
      this.evaluate(exitInterrupt);
    }
  }
  unsafePoll() {
    return this._exit;
  }
  evaluate(effect) {
    if (this._exit) {
      return;
    } else if (this._yielded !== void 0) {
      const yielded = this._yielded;
      this._yielded = void 0;
      yielded();
    }
    const exit2 = this.runLoop(effect);
    if (exit2 === Yield) {
      return;
    }
    const interruptChildren = fiberMiddleware.interruptChildren && fiberMiddleware.interruptChildren(this);
    if (interruptChildren !== void 0) {
      return this.evaluate(flatMap(interruptChildren, () => exit2));
    }
    this._exit = exit2;
    for (let i = 0; i < this._observers.length; i++) {
      this._observers[i](exit2);
    }
    this._observers.length = 0;
  }
  runLoop(effect) {
    let yielding = false;
    let current = effect;
    this.currentOpCount = 0;
    try {
      while (true) {
        this.currentOpCount++;
        if (!yielding && this.getRef(CurrentScheduler).shouldYield(this)) {
          yielding = true;
          const prev = current;
          current = flatMap(yieldNow, () => prev);
        }
        current = current[evaluate](this);
        if (current === Yield) {
          const yielded = this._yielded;
          if (MicroExitTypeId in yielded) {
            this._yielded = void 0;
            return yielded;
          }
          return Yield;
        }
      }
    } catch (error) {
      if (!hasProperty(current, evaluate)) {
        return exitDie(`MicroFiber.runLoop: Not a valid effect: ${String(current)}`);
      }
      return exitDie(error);
    }
  }
  getCont(symbol3) {
    while (true) {
      const op = this._stack.pop();
      if (!op) return void 0;
      const cont = op[ensureCont] && op[ensureCont](this);
      if (cont) return {
        [symbol3]: cont
      };
      if (op[symbol3]) return op;
    }
  }
  // cancel the yielded operation, or for the yielded exit value
  _yielded = void 0;
  yieldWith(value) {
    this._yielded = value;
    return Yield;
  }
  children() {
    return this._children ??= /* @__PURE__ */ new Set();
  }
};
var fiberMiddleware = /* @__PURE__ */ globalValue("effect/Micro/fiberMiddleware", () => ({
  interruptChildren: void 0
}));
var fiberInterruptAll = (fibers) => suspend(() => {
  for (const fiber of fibers) fiber.unsafeInterrupt();
  const iter = fibers[Symbol.iterator]();
  const wait = suspend(() => {
    let result = iter.next();
    while (!result.done) {
      if (result.value.unsafePoll()) {
        result = iter.next();
        continue;
      }
      const fiber = result.value;
      return async((resume) => {
        fiber.addObserver((_) => {
          resume(wait);
        });
      });
    }
    return exitVoid;
  });
  return wait;
});
var identifier = /* @__PURE__ */ Symbol.for("effect/Micro/identifier");
var args = /* @__PURE__ */ Symbol.for("effect/Micro/args");
var evaluate = /* @__PURE__ */ Symbol.for("effect/Micro/evaluate");
var successCont = /* @__PURE__ */ Symbol.for("effect/Micro/successCont");
var failureCont = /* @__PURE__ */ Symbol.for("effect/Micro/failureCont");
var ensureCont = /* @__PURE__ */ Symbol.for("effect/Micro/ensureCont");
var Yield = /* @__PURE__ */ Symbol.for("effect/Micro/Yield");
var microVariance = {
  _A: identity,
  _E: identity,
  _R: identity
};
var MicroProto = {
  ...EffectPrototype2,
  _op: "Micro",
  [TypeId2]: microVariance,
  pipe() {
    return pipeArguments(this, arguments);
  },
  [Symbol.iterator]() {
    return new SingleShotGen(new YieldWrap(this));
  },
  toJSON() {
    return {
      _id: "Micro",
      op: this[identifier],
      ...args in this ? {
        args: this[args]
      } : void 0
    };
  },
  toString() {
    return format(this);
  },
  [NodeInspectSymbol]() {
    return format(this);
  }
};
function defaultEvaluate(_fiber) {
  return exitDie(`Micro.evaluate: Not implemented`);
}
var makePrimitiveProto = (options) => ({
  ...MicroProto,
  [identifier]: options.op,
  [evaluate]: options.eval ?? defaultEvaluate,
  [successCont]: options.contA,
  [failureCont]: options.contE,
  [ensureCont]: options.ensure
});
var makePrimitive = (options) => {
  const Proto = makePrimitiveProto(options);
  return function() {
    const self = Object.create(Proto);
    self[args] = options.single === false ? arguments : arguments[0];
    return self;
  };
};
var makeExit = (options) => {
  const Proto = {
    ...makePrimitiveProto(options),
    [MicroExitTypeId]: MicroExitTypeId,
    _tag: options.op,
    get [options.prop]() {
      return this[args];
    },
    toJSON() {
      return {
        _id: "MicroExit",
        _tag: options.op,
        [options.prop]: this[args]
      };
    },
    [symbol2](that) {
      return isMicroExit(that) && that._tag === options.op && equals(this[args], that[args]);
    },
    [symbol]() {
      return cached(this, combine(string(options.op))(hash(this[args])));
    }
  };
  return function(value) {
    const self = Object.create(Proto);
    self[args] = value;
    self[successCont] = void 0;
    self[failureCont] = void 0;
    self[ensureCont] = void 0;
    return self;
  };
};
var succeed = /* @__PURE__ */ makeExit({
  op: "Success",
  prop: "value",
  eval(fiber) {
    const cont = fiber.getCont(successCont);
    return cont ? cont[successCont](this[args], fiber) : fiber.yieldWith(this);
  }
});
var failCause = /* @__PURE__ */ makeExit({
  op: "Failure",
  prop: "cause",
  eval(fiber) {
    let cont = fiber.getCont(failureCont);
    while (causeIsInterrupt(this[args]) && cont && fiber.interruptible) {
      cont = fiber.getCont(failureCont);
    }
    return cont ? cont[failureCont](this[args], fiber) : fiber.yieldWith(this);
  }
});
var fail = (error) => failCause(causeFail(error));
var sync = /* @__PURE__ */ makePrimitive({
  op: "Sync",
  eval(fiber) {
    const value = this[args]();
    const cont = fiber.getCont(successCont);
    return cont ? cont[successCont](value, fiber) : fiber.yieldWith(exitSucceed(value));
  }
});
var suspend = /* @__PURE__ */ makePrimitive({
  op: "Suspend",
  eval(_fiber) {
    return this[args]();
  }
});
var yieldNowWith = /* @__PURE__ */ makePrimitive({
  op: "Yield",
  eval(fiber) {
    let resumed = false;
    fiber.getRef(CurrentScheduler).scheduleTask(() => {
      if (resumed) return;
      fiber.evaluate(exitVoid);
    }, this[args] ?? 0);
    return fiber.yieldWith(() => {
      resumed = true;
    });
  }
});
var yieldNow = /* @__PURE__ */ yieldNowWith(0);
var die = (defect) => exitDie(defect);
var void_ = /* @__PURE__ */ succeed(void 0);
var try_ = (options) => suspend(() => {
  try {
    return succeed(options.try());
  } catch (err) {
    return fail(options.catch(err));
  }
});
var promise = (evaluate2) => asyncOptions(function(resume, signal) {
  evaluate2(signal).then((a) => resume(succeed(a)), (e) => resume(die(e)));
}, evaluate2.length !== 0);
var tryPromise = (options) => asyncOptions(function(resume, signal) {
  try {
    options.try(signal).then((a) => resume(succeed(a)), (e) => resume(fail(options.catch(e))));
  } catch (err) {
    resume(fail(options.catch(err)));
  }
}, options.try.length !== 0);
var withMicroFiber = /* @__PURE__ */ makePrimitive({
  op: "WithMicroFiber",
  eval(fiber) {
    return this[args](fiber);
  }
});
var asyncOptions = /* @__PURE__ */ makePrimitive({
  op: "Async",
  single: false,
  eval(fiber) {
    const register = this[args][0];
    let resumed = false;
    let yielded = false;
    const controller = this[args][1] ? new AbortController() : void 0;
    const onCancel = register((effect) => {
      if (resumed) return;
      resumed = true;
      if (yielded) {
        fiber.evaluate(effect);
      } else {
        yielded = effect;
      }
    }, controller?.signal);
    if (yielded !== false) return yielded;
    yielded = true;
    fiber._yielded = () => {
      resumed = true;
    };
    if (controller === void 0 && onCancel === void 0) {
      return Yield;
    }
    fiber._stack.push(asyncFinalizer(() => {
      resumed = true;
      controller?.abort();
      return onCancel ?? exitVoid;
    }));
    return Yield;
  }
});
var asyncFinalizer = /* @__PURE__ */ makePrimitive({
  op: "AsyncFinalizer",
  ensure(fiber) {
    if (fiber.interruptible) {
      fiber.interruptible = false;
      fiber._stack.push(setInterruptible(true));
    }
  },
  contE(cause, _fiber) {
    return causeIsInterrupt(cause) ? flatMap(this[args](), () => failCause(cause)) : failCause(cause);
  }
});
var async = (register) => asyncOptions(register, register.length >= 2);
var gen = (...args2) => suspend(() => fromIterator(args2.length === 1 ? args2[0]() : args2[1].call(args2[0])));
var fromIterator = /* @__PURE__ */ makePrimitive({
  op: "Iterator",
  contA(value, fiber) {
    const state = this[args].next(value);
    if (state.done) return succeed(state.value);
    fiber._stack.push(this);
    return yieldWrapGet(state.value);
  },
  eval(fiber) {
    return this[successCont](void 0, fiber);
  }
});
var as = /* @__PURE__ */ dual(2, (self, value) => map(self, (_) => value));
var andThen = /* @__PURE__ */ dual(2, (self, f) => flatMap(self, (a) => {
  const value = isMicro(f) ? f : typeof f === "function" ? f(a) : f;
  return isMicro(value) ? value : succeed(value);
}));
var tap = /* @__PURE__ */ dual(2, (self, f) => flatMap(self, (a) => {
  const value = isMicro(f) ? f : typeof f === "function" ? f(a) : f;
  return isMicro(value) ? as(value, a) : succeed(a);
}));
var exit = (self) => matchCause(self, {
  onFailure: exitFailCause,
  onSuccess: exitSucceed
});
var flatMap = /* @__PURE__ */ dual(2, (self, f) => {
  const onSuccess = Object.create(OnSuccessProto);
  onSuccess[args] = self;
  onSuccess[successCont] = f;
  return onSuccess;
});
var OnSuccessProto = /* @__PURE__ */ makePrimitiveProto({
  op: "OnSuccess",
  eval(fiber) {
    fiber._stack.push(this);
    return this[args];
  }
});
var map = /* @__PURE__ */ dual(2, (self, f) => flatMap(self, (a) => succeed(f(a))));
var isMicroExit = (u) => hasProperty(u, MicroExitTypeId);
var exitSucceed = succeed;
var exitFailCause = failCause;
var exitInterrupt = /* @__PURE__ */ exitFailCause(/* @__PURE__ */ causeInterrupt());
var exitDie = (defect) => exitFailCause(causeDie(defect));
var exitIsFailure = (self) => self._tag === "Failure";
var exitVoid = /* @__PURE__ */ exitSucceed(void 0);
var exitVoidAll = (exits) => {
  for (const exit2 of exits) {
    if (exit2._tag === "Failure") {
      return exit2;
    }
  }
  return exitVoid;
};
var setImmediate = "setImmediate" in globalThis ? globalThis.setImmediate : (f) => setTimeout(f, 0);
var MicroSchedulerDefault = class {
  tasks = [];
  running = false;
  /**
   * @since 3.5.9
   */
  scheduleTask(task, _priority) {
    this.tasks.push(task);
    if (!this.running) {
      this.running = true;
      setImmediate(this.afterScheduled);
    }
  }
  /**
   * @since 3.5.9
   */
  afterScheduled = () => {
    this.running = false;
    this.runTasks();
  };
  /**
   * @since 3.5.9
   */
  runTasks() {
    const tasks = this.tasks;
    this.tasks = [];
    for (let i = 0, len = tasks.length; i < len; i++) {
      tasks[i]();
    }
  }
  /**
   * @since 3.5.9
   */
  shouldYield(fiber) {
    return fiber.currentOpCount >= fiber.getRef(MaxOpsBeforeYield);
  }
  /**
   * @since 3.5.9
   */
  flush() {
    while (this.tasks.length > 0) {
      this.runTasks();
    }
  }
};
var service = (tag) => withMicroFiber((fiber) => succeed(unsafeGet2(fiber.context, tag)));
var updateContext = /* @__PURE__ */ dual(2, (self, f) => withMicroFiber((fiber) => {
  const prev = fiber.context;
  fiber.context = f(prev);
  return onExit(self, () => {
    fiber.context = prev;
    return void_;
  });
}));
var provideService = /* @__PURE__ */ dual(3, (self, tag, service2) => updateContext(self, add2(tag, service2)));
var MaxOpsBeforeYield = class extends (/* @__PURE__ */ Reference2()("effect/Micro/currentMaxOpsBeforeYield", {
  defaultValue: () => 2048
})) {
};
var CurrentConcurrency = class extends (/* @__PURE__ */ Reference2()("effect/Micro/currentConcurrency", {
  defaultValue: () => "unbounded"
})) {
};
var CurrentScheduler = class extends (/* @__PURE__ */ Reference2()("effect/Micro/currentScheduler", {
  defaultValue: () => new MicroSchedulerDefault()
})) {
};
var filterOrFail = /* @__PURE__ */ dual((args2) => isMicro(args2[0]), (self, refinement, orFailWith) => flatMap(self, (a) => refinement(a) ? succeed(a) : fail(orFailWith(a))));
var catchAllCause = /* @__PURE__ */ dual(2, (self, f) => {
  const onFailure = Object.create(OnFailureProto);
  onFailure[args] = self;
  onFailure[failureCont] = f;
  return onFailure;
});
var OnFailureProto = /* @__PURE__ */ makePrimitiveProto({
  op: "OnFailure",
  eval(fiber) {
    fiber._stack.push(this);
    return this[args];
  }
});
var catchCauseIf = /* @__PURE__ */ dual(3, (self, predicate, f) => catchAllCause(self, (cause) => predicate(cause) ? f(cause) : failCause(cause)));
var catchAll = /* @__PURE__ */ dual(2, (self, f) => catchCauseIf(self, causeIsFail, (cause) => f(cause.error)));
var tapErrorCauseIf = /* @__PURE__ */ dual(3, (self, refinement, f) => catchCauseIf(self, refinement, (cause) => andThen(f(cause), failCause(cause))));
var tapError = /* @__PURE__ */ dual(2, (self, f) => tapErrorCauseIf(self, causeIsFail, (fail2) => f(fail2.error)));
var catchIf = /* @__PURE__ */ dual(3, (self, predicate, f) => catchCauseIf(self, (f2) => causeIsFail(f2) && predicate(f2.error), (fail2) => f(fail2.error)));
var catchTag = /* @__PURE__ */ dual(3, (self, k, f) => catchIf(self, isTagged(k), f));
var orElseSucceed = /* @__PURE__ */ dual(2, (self, f) => catchAll(self, (_) => sync(f)));
var withTrace = function() {
  const prevLimit = globalThis.Error.stackTraceLimit;
  globalThis.Error.stackTraceLimit = 2;
  const error = new globalThis.Error();
  globalThis.Error.stackTraceLimit = prevLimit;
  function generate(name, cause) {
    const stack = error.stack;
    if (!stack) {
      return cause;
    }
    const line = stack.split("\n")[2]?.trim().replace(/^at /, "");
    if (!line) {
      return cause;
    }
    const lineMatch = line.match(/\((.*)\)$/);
    return causeWithTrace(cause, `at ${name} (${lineMatch ? lineMatch[1] : line})`);
  }
  const f = (name) => (self) => onError(self, (cause) => failCause(generate(name, cause)));
  if (arguments.length === 2) {
    return f(arguments[1])(arguments[0]);
  }
  return f(arguments[0]);
};
var matchCauseEffect = /* @__PURE__ */ dual(2, (self, options) => {
  const primitive = Object.create(OnSuccessAndFailureProto);
  primitive[args] = self;
  primitive[successCont] = options.onSuccess;
  primitive[failureCont] = options.onFailure;
  return primitive;
});
var OnSuccessAndFailureProto = /* @__PURE__ */ makePrimitiveProto({
  op: "OnSuccessAndFailure",
  eval(fiber) {
    fiber._stack.push(this);
    return this[args];
  }
});
var matchCause = /* @__PURE__ */ dual(2, (self, options) => matchCauseEffect(self, {
  onFailure: (cause) => sync(() => options.onFailure(cause)),
  onSuccess: (value) => sync(() => options.onSuccess(value))
}));
var MicroScopeTypeId = /* @__PURE__ */ Symbol.for("effect/Micro/MicroScope");
var MicroScopeImpl = class _MicroScopeImpl {
  [MicroScopeTypeId];
  state = {
    _tag: "Open",
    finalizers: /* @__PURE__ */ new Set()
  };
  constructor() {
    this[MicroScopeTypeId] = MicroScopeTypeId;
  }
  unsafeAddFinalizer(finalizer) {
    if (this.state._tag === "Open") {
      this.state.finalizers.add(finalizer);
    }
  }
  addFinalizer(finalizer) {
    return suspend(() => {
      if (this.state._tag === "Open") {
        this.state.finalizers.add(finalizer);
        return void_;
      }
      return finalizer(this.state.exit);
    });
  }
  unsafeRemoveFinalizer(finalizer) {
    if (this.state._tag === "Open") {
      this.state.finalizers.delete(finalizer);
    }
  }
  close(microExit) {
    return suspend(() => {
      if (this.state._tag === "Open") {
        const finalizers = Array.from(this.state.finalizers).reverse();
        this.state = {
          _tag: "Closed",
          exit: microExit
        };
        return flatMap(forEach(finalizers, (finalizer) => exit(finalizer(microExit))), exitVoidAll);
      }
      return void_;
    });
  }
  get fork() {
    return sync(() => {
      const newScope = new _MicroScopeImpl();
      if (this.state._tag === "Closed") {
        newScope.state = this.state;
        return newScope;
      }
      function fin(exit2) {
        return newScope.close(exit2);
      }
      this.state.finalizers.add(fin);
      newScope.unsafeAddFinalizer((_) => sync(() => this.unsafeRemoveFinalizer(fin)));
      return newScope;
    });
  }
};
var onExit = /* @__PURE__ */ dual(2, (self, f) => uninterruptibleMask((restore) => matchCauseEffect(restore(self), {
  onFailure: (cause) => flatMap(f(exitFailCause(cause)), () => failCause(cause)),
  onSuccess: (a) => flatMap(f(exitSucceed(a)), () => succeed(a))
})));
var onExitIf = /* @__PURE__ */ dual(3, (self, refinement, f) => onExit(self, (exit2) => refinement(exit2) ? f(exit2) : exitVoid));
var onError = /* @__PURE__ */ dual(2, (self, f) => onExitIf(self, exitIsFailure, (exit2) => f(exit2.cause)));
var setInterruptible = /* @__PURE__ */ makePrimitive({
  op: "SetInterruptible",
  ensure(fiber) {
    fiber.interruptible = this[args];
    if (fiber._interrupted && fiber.interruptible) {
      return () => exitInterrupt;
    }
  }
});
var interruptible = (self) => withMicroFiber((fiber) => {
  if (fiber.interruptible) return self;
  fiber.interruptible = true;
  fiber._stack.push(setInterruptible(false));
  if (fiber._interrupted) return exitInterrupt;
  return self;
});
var uninterruptibleMask = (f) => withMicroFiber((fiber) => {
  if (!fiber.interruptible) return f(identity);
  fiber.interruptible = false;
  fiber._stack.push(setInterruptible(true));
  return f(interruptible);
});
var whileLoop = /* @__PURE__ */ makePrimitive({
  op: "While",
  contA(value, fiber) {
    this[args].step(value);
    if (this[args].while()) {
      fiber._stack.push(this);
      return this[args].body();
    }
    return exitVoid;
  },
  eval(fiber) {
    if (this[args].while()) {
      fiber._stack.push(this);
      return this[args].body();
    }
    return exitVoid;
  }
});
var forEach = (iterable, f, options) => withMicroFiber((parent) => {
  const concurrencyOption = options?.concurrency === "inherit" ? parent.getRef(CurrentConcurrency) : options?.concurrency ?? 1;
  const concurrency = concurrencyOption === "unbounded" ? Number.POSITIVE_INFINITY : Math.max(1, concurrencyOption);
  const items = fromIterable(iterable);
  let length = items.length;
  if (length === 0) {
    return options?.discard ? void_ : succeed([]);
  }
  const out = options?.discard ? void 0 : new Array(length);
  let index = 0;
  if (concurrency === 1) {
    return as(whileLoop({
      while: () => index < items.length,
      body: () => f(items[index], index),
      step: out ? (b) => out[index++] = b : (_) => index++
    }), out);
  }
  return async((resume) => {
    const fibers = /* @__PURE__ */ new Set();
    let result = void 0;
    let inProgress = 0;
    let doneCount = 0;
    let pumping = false;
    let interrupted = false;
    function pump() {
      pumping = true;
      while (inProgress < concurrency && index < length) {
        const currentIndex = index;
        const item = items[currentIndex];
        index++;
        inProgress++;
        try {
          const child = unsafeFork(parent, f(item, currentIndex), true, true);
          fibers.add(child);
          child.addObserver((exit2) => {
            fibers.delete(child);
            if (interrupted) {
              return;
            } else if (exit2._tag === "Failure") {
              if (result === void 0) {
                result = exit2;
                length = index;
                fibers.forEach((fiber) => fiber.unsafeInterrupt());
              }
            } else if (out !== void 0) {
              out[currentIndex] = exit2.value;
            }
            doneCount++;
            inProgress--;
            if (doneCount === length) {
              resume(result ?? succeed(out));
            } else if (!pumping && inProgress < concurrency) {
              pump();
            }
          });
        } catch (err) {
          result = exitDie(err);
          length = index;
          fibers.forEach((fiber) => fiber.unsafeInterrupt());
        }
      }
      pumping = false;
    }
    pump();
    return suspend(() => {
      interrupted = true;
      index = length;
      return fiberInterruptAll(fibers);
    });
  });
});
var unsafeFork = (parent, effect, immediate = false, daemon = false) => {
  const child = new MicroFiberImpl(parent.context, parent.interruptible);
  if (!daemon) {
    parent.children().add(child);
    child.addObserver(() => parent.children().delete(child));
  }
  if (immediate) {
    child.evaluate(effect);
  } else {
    parent.getRef(CurrentScheduler).scheduleTask(() => child.evaluate(effect), 0);
  }
  return child;
};
var runFork = (effect, options) => {
  const fiber = new MicroFiberImpl(CurrentScheduler.context(options?.scheduler ?? new MicroSchedulerDefault()));
  fiber.evaluate(effect);
  if (options?.signal) {
    if (options.signal.aborted) {
      fiber.unsafeInterrupt();
    } else {
      const abort = () => fiber.unsafeInterrupt();
      options.signal.addEventListener("abort", abort, {
        once: true
      });
      fiber.addObserver(() => options.signal.removeEventListener("abort", abort));
    }
  }
  return fiber;
};
var runPromiseExit = (effect, options) => new Promise((resolve, _reject) => {
  const handle = runFork(effect, options);
  handle.addObserver(resolve);
});
var runPromise = (effect, options) => runPromiseExit(effect, options).then((exit2) => {
  if (exit2._tag === "Failure") {
    throw exit2.cause;
  }
  return exit2.value;
});
var runSyncExit = (effect) => {
  const scheduler = new MicroSchedulerDefault();
  const fiber = runFork(effect, {
    scheduler
  });
  scheduler.flush();
  return fiber._exit ?? exitDie(fiber);
};
var runSync = (effect) => {
  const exit2 = runSyncExit(effect);
  if (exit2._tag === "Failure") throw exit2.cause;
  return exit2.value;
};
var YieldableError = /* @__PURE__ */ (function() {
  class YieldableError2 extends globalThis.Error {
  }
  Object.assign(YieldableError2.prototype, MicroProto, StructuralPrototype, {
    [identifier]: "Failure",
    [evaluate]() {
      return fail(this);
    },
    toString() {
      return this.message ? `${this.name}: ${this.message}` : this.name;
    },
    toJSON() {
      return {
        ...this
      };
    },
    [NodeInspectSymbol]() {
      const stack = this.stack;
      if (stack) {
        return `${this.toString()}
${stack.split("\n").slice(1).join("\n")}`;
      }
      return this.toString();
    }
  });
  return YieldableError2;
})();
var Error2 = /* @__PURE__ */ (function() {
  return class extends YieldableError {
    constructor(args2) {
      super();
      if (args2) {
        Object.assign(this, args2);
      }
    }
  };
})();
var TaggedError = (tag) => {
  class Base2 extends Error2 {
    _tag = tag;
  }
  ;
  Base2.prototype.name = tag;
  return Base2;
};

// node_modules/@uploadthing/mime-types/dist/application-uIfSUPTG.js
var application = {
  "application/andrew-inset": {
    source: "iana",
    extensions: ["ez"]
  },
  "application/applixware": {
    source: "apache",
    extensions: ["aw"]
  },
  "application/atom+xml": {
    source: "iana",
    extensions: ["atom"]
  },
  "application/atomcat+xml": {
    source: "iana",
    extensions: ["atomcat"]
  },
  "application/atomdeleted+xml": {
    source: "iana",
    extensions: ["atomdeleted"]
  },
  "application/atomsvc+xml": {
    source: "iana",
    extensions: ["atomsvc"]
  },
  "application/atsc-dwd+xml": {
    source: "iana",
    extensions: ["dwd"]
  },
  "application/atsc-held+xml": {
    source: "iana",
    extensions: ["held"]
  },
  "application/atsc-rsat+xml": {
    source: "iana",
    extensions: ["rsat"]
  },
  "application/calendar+xml": {
    source: "iana",
    extensions: ["xcs"]
  },
  "application/ccxml+xml": {
    source: "iana",
    extensions: ["ccxml"]
  },
  "application/cdfx+xml": {
    source: "iana",
    extensions: ["cdfx"]
  },
  "application/cdmi-capability": {
    source: "iana",
    extensions: ["cdmia"]
  },
  "application/cdmi-container": {
    source: "iana",
    extensions: ["cdmic"]
  },
  "application/cdmi-domain": {
    source: "iana",
    extensions: ["cdmid"]
  },
  "application/cdmi-object": {
    source: "iana",
    extensions: ["cdmio"]
  },
  "application/cdmi-queue": {
    source: "iana",
    extensions: ["cdmiq"]
  },
  "application/cpl+xml": {
    source: "iana",
    extensions: ["cpl"]
  },
  "application/cu-seeme": {
    source: "apache",
    extensions: ["cu"]
  },
  "application/dash+xml": {
    source: "iana",
    extensions: ["mpd"]
  },
  "application/dash-patch+xml": {
    source: "iana",
    extensions: ["mpp"]
  },
  "application/davmount+xml": {
    source: "iana",
    extensions: ["davmount"]
  },
  "application/dicom": {
    source: "iana",
    extensions: ["dcm"]
  },
  "application/docbook+xml": {
    source: "apache",
    extensions: ["dbk"]
  },
  "application/dssc+der": {
    source: "iana",
    extensions: ["dssc"]
  },
  "application/dssc+xml": {
    source: "iana",
    extensions: ["xdssc"]
  },
  "application/ecmascript": {
    source: "iana",
    extensions: ["es", "ecma"]
  },
  "application/emma+xml": {
    source: "iana",
    extensions: ["emma"]
  },
  "application/emotionml+xml": {
    source: "iana",
    extensions: ["emotionml"]
  },
  "application/epub+zip": {
    source: "iana",
    extensions: ["epub"]
  },
  "application/exi": {
    source: "iana",
    extensions: ["exi"]
  },
  "application/express": {
    source: "iana",
    extensions: ["exp"]
  },
  "application/fdt+xml": {
    source: "iana",
    extensions: ["fdt"]
  },
  "application/font-tdpfr": {
    source: "iana",
    extensions: ["pfr"]
  },
  "application/geo+json": {
    source: "iana",
    extensions: ["geojson"]
  },
  "application/gml+xml": {
    source: "iana",
    extensions: ["gml"]
  },
  "application/gpx+xml": {
    source: "apache",
    extensions: ["gpx"]
  },
  "application/gxf": {
    source: "apache",
    extensions: ["gxf"]
  },
  "application/gzip": {
    source: "iana",
    extensions: ["gz"]
  },
  "application/hyperstudio": {
    source: "iana",
    extensions: ["stk"]
  },
  "application/inkml+xml": {
    source: "iana",
    extensions: ["ink", "inkml"]
  },
  "application/ipfix": {
    source: "iana",
    extensions: ["ipfix"]
  },
  "application/its+xml": {
    source: "iana",
    extensions: ["its"]
  },
  "application/java-archive": {
    source: "apache",
    extensions: [
      "jar",
      "war",
      "ear"
    ]
  },
  "application/java-serialized-object": {
    source: "apache",
    extensions: ["ser"]
  },
  "application/java-vm": {
    source: "apache",
    extensions: ["class"]
  },
  "application/javascript": {
    source: "iana",
    charset: "UTF-8",
    extensions: ["js", "mjs"]
  },
  "application/json": {
    source: "iana",
    charset: "UTF-8",
    extensions: ["json", "map"]
  },
  "application/jsonml+json": {
    source: "apache",
    extensions: ["jsonml"]
  },
  "application/ld+json": {
    source: "iana",
    extensions: ["jsonld"]
  },
  "application/lgr+xml": {
    source: "iana",
    extensions: ["lgr"]
  },
  "application/lost+xml": {
    source: "iana",
    extensions: ["lostxml"]
  },
  "application/mac-binhex40": {
    source: "iana",
    extensions: ["hqx"]
  },
  "application/mac-compactpro": {
    source: "apache",
    extensions: ["cpt"]
  },
  "application/mads+xml": {
    source: "iana",
    extensions: ["mads"]
  },
  "application/manifest+json": {
    source: "iana",
    charset: "UTF-8",
    extensions: ["webmanifest"]
  },
  "application/marc": {
    source: "iana",
    extensions: ["mrc"]
  },
  "application/marcxml+xml": {
    source: "iana",
    extensions: ["mrcx"]
  },
  "application/mathematica": {
    source: "iana",
    extensions: [
      "ma",
      "nb",
      "mb"
    ]
  },
  "application/mathml+xml": {
    source: "iana",
    extensions: ["mathml"]
  },
  "application/mbox": {
    source: "iana",
    extensions: ["mbox"]
  },
  "application/media-policy-dataset+xml": {
    source: "iana",
    extensions: ["mpf"]
  },
  "application/mediaservercontrol+xml": {
    source: "iana",
    extensions: ["mscml"]
  },
  "application/metalink+xml": {
    source: "apache",
    extensions: ["metalink"]
  },
  "application/metalink4+xml": {
    source: "iana",
    extensions: ["meta4"]
  },
  "application/mets+xml": {
    source: "iana",
    extensions: ["mets"]
  },
  "application/mmt-aei+xml": {
    source: "iana",
    extensions: ["maei"]
  },
  "application/mmt-usd+xml": {
    source: "iana",
    extensions: ["musd"]
  },
  "application/mods+xml": {
    source: "iana",
    extensions: ["mods"]
  },
  "application/mp21": {
    source: "iana",
    extensions: ["m21", "mp21"]
  },
  "application/mp4": {
    source: "iana",
    extensions: ["mp4s", "m4p"]
  },
  "application/msword": {
    source: "iana",
    extensions: ["doc", "dot"]
  },
  "application/mxf": {
    source: "iana",
    extensions: ["mxf"]
  },
  "application/n-quads": {
    source: "iana",
    extensions: ["nq"]
  },
  "application/n-triples": {
    source: "iana",
    extensions: ["nt"]
  },
  "application/node": {
    source: "iana",
    extensions: ["cjs"]
  },
  "application/octet-stream": {
    source: "iana",
    extensions: [
      "bin",
      "dms",
      "lrf",
      "mar",
      "so",
      "dist",
      "distz",
      "pkg",
      "bpk",
      "dump",
      "elc",
      "deploy",
      "exe",
      "dll",
      "deb",
      "dmg",
      "iso",
      "img",
      "msi",
      "msp",
      "msm",
      "buffer"
    ]
  },
  "application/oda": {
    source: "iana",
    extensions: ["oda"]
  },
  "application/oebps-package+xml": {
    source: "iana",
    extensions: ["opf"]
  },
  "application/ogg": {
    source: "iana",
    extensions: ["ogx"]
  },
  "application/omdoc+xml": {
    source: "apache",
    extensions: ["omdoc"]
  },
  "application/onenote": {
    source: "apache",
    extensions: [
      "onetoc",
      "onetoc2",
      "onetmp",
      "onepkg"
    ]
  },
  "application/oxps": {
    source: "iana",
    extensions: ["oxps"]
  },
  "application/p2p-overlay+xml": {
    source: "iana",
    extensions: ["relo"]
  },
  "application/patch-ops-error+xml": {
    source: "iana",
    extensions: ["xer"]
  },
  "application/pdf": {
    source: "iana",
    extensions: ["pdf"]
  },
  "application/pgp-encrypted": {
    source: "iana",
    extensions: ["pgp"]
  },
  "application/pgp-keys": {
    source: "iana",
    extensions: ["asc"]
  },
  "application/pgp-signature": {
    source: "iana",
    extensions: ["asc", "sig"]
  },
  "application/pics-rules": {
    source: "apache",
    extensions: ["prf"]
  },
  "application/pkcs10": {
    source: "iana",
    extensions: ["p10"]
  },
  "application/pkcs7-mime": {
    source: "iana",
    extensions: ["p7m", "p7c"]
  },
  "application/pkcs7-signature": {
    source: "iana",
    extensions: ["p7s"]
  },
  "application/pkcs8": {
    source: "iana",
    extensions: ["p8"]
  },
  "application/pkix-attr-cert": {
    source: "iana",
    extensions: ["ac"]
  },
  "application/pkix-cert": {
    source: "iana",
    extensions: ["cer"]
  },
  "application/pkix-crl": {
    source: "iana",
    extensions: ["crl"]
  },
  "application/pkix-pkipath": {
    source: "iana",
    extensions: ["pkipath"]
  },
  "application/pkixcmp": {
    source: "iana",
    extensions: ["pki"]
  },
  "application/pls+xml": {
    source: "iana",
    extensions: ["pls"]
  },
  "application/postscript": {
    source: "iana",
    extensions: [
      "ai",
      "eps",
      "ps"
    ]
  },
  "application/provenance+xml": {
    source: "iana",
    extensions: ["provx"]
  },
  "application/prs.cww": {
    source: "iana",
    extensions: ["cww"]
  },
  "application/pskc+xml": {
    source: "iana",
    extensions: ["pskcxml"]
  },
  "application/rdf+xml": {
    source: "iana",
    extensions: ["rdf", "owl"]
  },
  "application/reginfo+xml": {
    source: "iana",
    extensions: ["rif"]
  },
  "application/relax-ng-compact-syntax": {
    source: "iana",
    extensions: ["rnc"]
  },
  "application/resource-lists+xml": {
    source: "iana",
    extensions: ["rl"]
  },
  "application/resource-lists-diff+xml": {
    source: "iana",
    extensions: ["rld"]
  },
  "application/rls-services+xml": {
    source: "iana",
    extensions: ["rs"]
  },
  "application/route-apd+xml": {
    source: "iana",
    extensions: ["rapd"]
  },
  "application/route-s-tsid+xml": {
    source: "iana",
    extensions: ["sls"]
  },
  "application/route-usd+xml": {
    source: "iana",
    extensions: ["rusd"]
  },
  "application/rpki-ghostbusters": {
    source: "iana",
    extensions: ["gbr"]
  },
  "application/rpki-manifest": {
    source: "iana",
    extensions: ["mft"]
  },
  "application/rpki-roa": {
    source: "iana",
    extensions: ["roa"]
  },
  "application/rsd+xml": {
    source: "apache",
    extensions: ["rsd"]
  },
  "application/rss+xml": {
    source: "apache",
    extensions: ["rss"]
  },
  "application/rtf": {
    source: "iana",
    extensions: ["rtf"]
  },
  "application/sbml+xml": {
    source: "iana",
    extensions: ["sbml"]
  },
  "application/scvp-cv-request": {
    source: "iana",
    extensions: ["scq"]
  },
  "application/scvp-cv-response": {
    source: "iana",
    extensions: ["scs"]
  },
  "application/scvp-vp-request": {
    source: "iana",
    extensions: ["spq"]
  },
  "application/scvp-vp-response": {
    source: "iana",
    extensions: ["spp"]
  },
  "application/sdp": {
    source: "iana",
    extensions: ["sdp"]
  },
  "application/senml+xml": {
    source: "iana",
    extensions: ["senmlx"]
  },
  "application/sensml+xml": {
    source: "iana",
    extensions: ["sensmlx"]
  },
  "application/set-payment-initiation": {
    source: "iana",
    extensions: ["setpay"]
  },
  "application/set-registration-initiation": {
    source: "iana",
    extensions: ["setreg"]
  },
  "application/shf+xml": {
    source: "iana",
    extensions: ["shf"]
  },
  "application/sieve": {
    source: "iana",
    extensions: ["siv", "sieve"]
  },
  "application/smil+xml": {
    source: "iana",
    extensions: ["smi", "smil"]
  },
  "application/sparql-query": {
    source: "iana",
    extensions: ["rq"]
  },
  "application/sparql-results+xml": {
    source: "iana",
    extensions: ["srx"]
  },
  "application/srgs": {
    source: "iana",
    extensions: ["gram"]
  },
  "application/srgs+xml": {
    source: "iana",
    extensions: ["grxml"]
  },
  "application/sru+xml": {
    source: "iana",
    extensions: ["sru"]
  },
  "application/ssdl+xml": {
    source: "apache",
    extensions: ["ssdl"]
  },
  "application/ssml+xml": {
    source: "iana",
    extensions: ["ssml"]
  },
  "application/swid+xml": {
    source: "iana",
    extensions: ["swidtag"]
  },
  "application/tei+xml": {
    source: "iana",
    extensions: ["tei", "teicorpus"]
  },
  "application/thraud+xml": {
    source: "iana",
    extensions: ["tfi"]
  },
  "application/timestamped-data": {
    source: "iana",
    extensions: ["tsd"]
  },
  "application/trig": {
    source: "iana",
    extensions: ["trig"]
  },
  "application/ttml+xml": {
    source: "iana",
    extensions: ["ttml"]
  },
  "application/urc-ressheet+xml": {
    source: "iana",
    extensions: ["rsheet"]
  },
  "application/urc-targetdesc+xml": {
    source: "iana",
    extensions: ["td"]
  },
  "application/vnd.1000minds.decision-model+xml": {
    source: "iana",
    extensions: ["1km"]
  },
  "application/vnd.3gpp.pic-bw-large": {
    source: "iana",
    extensions: ["plb"]
  },
  "application/vnd.3gpp.pic-bw-small": {
    source: "iana",
    extensions: ["psb"]
  },
  "application/vnd.3gpp.pic-bw-var": {
    source: "iana",
    extensions: ["pvb"]
  },
  "application/vnd.3gpp2.tcap": {
    source: "iana",
    extensions: ["tcap"]
  },
  "application/vnd.3m.post-it-notes": {
    source: "iana",
    extensions: ["pwn"]
  },
  "application/vnd.accpac.simply.aso": {
    source: "iana",
    extensions: ["aso"]
  },
  "application/vnd.accpac.simply.imp": {
    source: "iana",
    extensions: ["imp"]
  },
  "application/vnd.acucobol": {
    source: "iana",
    extensions: ["acu"]
  },
  "application/vnd.acucorp": {
    source: "iana",
    extensions: ["atc", "acutc"]
  },
  "application/vnd.adobe.air-application-installer-package+zip": {
    source: "apache",
    extensions: ["air"]
  },
  "application/vnd.adobe.formscentral.fcdt": {
    source: "iana",
    extensions: ["fcdt"]
  },
  "application/vnd.adobe.fxp": {
    source: "iana",
    extensions: ["fxp", "fxpl"]
  },
  "application/vnd.adobe.xdp+xml": {
    source: "iana",
    extensions: ["xdp"]
  },
  "application/vnd.adobe.xfdf": {
    source: "iana",
    extensions: ["xfdf"]
  },
  "application/vnd.age": {
    source: "iana",
    extensions: ["age"]
  },
  "application/vnd.ahead.space": {
    source: "iana",
    extensions: ["ahead"]
  },
  "application/vnd.airzip.filesecure.azf": {
    source: "iana",
    extensions: ["azf"]
  },
  "application/vnd.airzip.filesecure.azs": {
    source: "iana",
    extensions: ["azs"]
  },
  "application/vnd.amazon.ebook": {
    source: "apache",
    extensions: ["azw"]
  },
  "application/vnd.americandynamics.acc": {
    source: "iana",
    extensions: ["acc"]
  },
  "application/vnd.amiga.ami": {
    source: "iana",
    extensions: ["ami"]
  },
  "application/vnd.android.package-archive": {
    source: "apache",
    extensions: ["apk"]
  },
  "application/vnd.anser-web-certificate-issue-initiation": {
    source: "iana",
    extensions: ["cii"]
  },
  "application/vnd.anser-web-funds-transfer-initiation": {
    source: "apache",
    extensions: ["fti"]
  },
  "application/vnd.antix.game-component": {
    source: "iana",
    extensions: ["atx"]
  },
  "application/vnd.apple.installer+xml": {
    source: "iana",
    extensions: ["mpkg"]
  },
  "application/vnd.apple.keynote": {
    source: "iana",
    extensions: ["key"]
  },
  "application/vnd.apple.mpegurl": {
    source: "iana",
    extensions: ["m3u8"]
  },
  "application/vnd.apple.numbers": {
    source: "iana",
    extensions: ["numbers"]
  },
  "application/vnd.apple.pages": {
    source: "iana",
    extensions: ["pages"]
  },
  "application/vnd.aristanetworks.swi": {
    source: "iana",
    extensions: ["swi"]
  },
  "application/vnd.astraea-software.iota": {
    source: "iana",
    extensions: ["iota"]
  },
  "application/vnd.audiograph": {
    source: "iana",
    extensions: ["aep"]
  },
  "application/vnd.balsamiq.bmml+xml": {
    source: "iana",
    extensions: ["bmml"]
  },
  "application/vnd.blueice.multipass": {
    source: "iana",
    extensions: ["mpm"]
  },
  "application/vnd.bmi": {
    source: "iana",
    extensions: ["bmi"]
  },
  "application/vnd.businessobjects": {
    source: "iana",
    extensions: ["rep"]
  },
  "application/vnd.chemdraw+xml": {
    source: "iana",
    extensions: ["cdxml"]
  },
  "application/vnd.chipnuts.karaoke-mmd": {
    source: "iana",
    extensions: ["mmd"]
  },
  "application/vnd.cinderella": {
    source: "iana",
    extensions: ["cdy"]
  },
  "application/vnd.citationstyles.style+xml": {
    source: "iana",
    extensions: ["csl"]
  },
  "application/vnd.claymore": {
    source: "iana",
    extensions: ["cla"]
  },
  "application/vnd.cloanto.rp9": {
    source: "iana",
    extensions: ["rp9"]
  },
  "application/vnd.clonk.c4group": {
    source: "iana",
    extensions: [
      "c4g",
      "c4d",
      "c4f",
      "c4p",
      "c4u"
    ]
  },
  "application/vnd.cluetrust.cartomobile-config": {
    source: "iana",
    extensions: ["c11amc"]
  },
  "application/vnd.cluetrust.cartomobile-config-pkg": {
    source: "iana",
    extensions: ["c11amz"]
  },
  "application/vnd.commonspace": {
    source: "iana",
    extensions: ["csp"]
  },
  "application/vnd.contact.cmsg": {
    source: "iana",
    extensions: ["cdbcmsg"]
  },
  "application/vnd.cosmocaller": {
    source: "iana",
    extensions: ["cmc"]
  },
  "application/vnd.crick.clicker": {
    source: "iana",
    extensions: ["clkx"]
  },
  "application/vnd.crick.clicker.keyboard": {
    source: "iana",
    extensions: ["clkk"]
  },
  "application/vnd.crick.clicker.palette": {
    source: "iana",
    extensions: ["clkp"]
  },
  "application/vnd.crick.clicker.template": {
    source: "iana",
    extensions: ["clkt"]
  },
  "application/vnd.crick.clicker.wordbank": {
    source: "iana",
    extensions: ["clkw"]
  },
  "application/vnd.criticaltools.wbs+xml": {
    source: "iana",
    extensions: ["wbs"]
  },
  "application/vnd.ctc-posml": {
    source: "iana",
    extensions: ["pml"]
  },
  "application/vnd.cups-ppd": {
    source: "iana",
    extensions: ["ppd"]
  },
  "application/vnd.curl.car": {
    source: "apache",
    extensions: ["car"]
  },
  "application/vnd.curl.pcurl": {
    source: "apache",
    extensions: ["pcurl"]
  },
  "application/vnd.dart": {
    source: "iana",
    extensions: ["dart"]
  },
  "application/vnd.data-vision.rdz": {
    source: "iana",
    extensions: ["rdz"]
  },
  "application/vnd.dbf": {
    source: "iana",
    extensions: ["dbf"]
  },
  "application/vnd.dece.data": {
    source: "iana",
    extensions: [
      "uvf",
      "uvvf",
      "uvd",
      "uvvd"
    ]
  },
  "application/vnd.dece.ttml+xml": {
    source: "iana",
    extensions: ["uvt", "uvvt"]
  },
  "application/vnd.dece.unspecified": {
    source: "iana",
    extensions: ["uvx", "uvvx"]
  },
  "application/vnd.dece.zip": {
    source: "iana",
    extensions: ["uvz", "uvvz"]
  },
  "application/vnd.denovo.fcselayout-link": {
    source: "iana",
    extensions: ["fe_launch"]
  },
  "application/vnd.dna": {
    source: "iana",
    extensions: ["dna"]
  },
  "application/vnd.dolby.mlp": {
    source: "apache",
    extensions: ["mlp"]
  },
  "application/vnd.dpgraph": {
    source: "iana",
    extensions: ["dpg"]
  },
  "application/vnd.dreamfactory": {
    source: "iana",
    extensions: ["dfac"]
  },
  "application/vnd.ds-keypoint": {
    source: "apache",
    extensions: ["kpxx"]
  },
  "application/vnd.dvb.ait": {
    source: "iana",
    extensions: ["ait"]
  },
  "application/vnd.dvb.service": {
    source: "iana",
    extensions: ["svc"]
  },
  "application/vnd.dynageo": {
    source: "iana",
    extensions: ["geo"]
  },
  "application/vnd.ecowin.chart": {
    source: "iana",
    extensions: ["mag"]
  },
  "application/vnd.enliven": {
    source: "iana",
    extensions: ["nml"]
  },
  "application/vnd.epson.esf": {
    source: "iana",
    extensions: ["esf"]
  },
  "application/vnd.epson.msf": {
    source: "iana",
    extensions: ["msf"]
  },
  "application/vnd.epson.quickanime": {
    source: "iana",
    extensions: ["qam"]
  },
  "application/vnd.epson.salt": {
    source: "iana",
    extensions: ["slt"]
  },
  "application/vnd.epson.ssf": {
    source: "iana",
    extensions: ["ssf"]
  },
  "application/vnd.eszigno3+xml": {
    source: "iana",
    extensions: ["es3", "et3"]
  },
  "application/vnd.ezpix-album": {
    source: "iana",
    extensions: ["ez2"]
  },
  "application/vnd.ezpix-package": {
    source: "iana",
    extensions: ["ez3"]
  },
  "application/vnd.fdf": {
    source: "iana",
    extensions: ["fdf"]
  },
  "application/vnd.fdsn.mseed": {
    source: "iana",
    extensions: ["mseed"]
  },
  "application/vnd.fdsn.seed": {
    source: "iana",
    extensions: ["seed", "dataless"]
  },
  "application/vnd.flographit": {
    source: "iana",
    extensions: ["gph"]
  },
  "application/vnd.fluxtime.clip": {
    source: "iana",
    extensions: ["ftc"]
  },
  "application/vnd.framemaker": {
    source: "iana",
    extensions: [
      "fm",
      "frame",
      "maker",
      "book"
    ]
  },
  "application/vnd.frogans.fnc": {
    source: "iana",
    extensions: ["fnc"]
  },
  "application/vnd.frogans.ltf": {
    source: "iana",
    extensions: ["ltf"]
  },
  "application/vnd.fsc.weblaunch": {
    source: "iana",
    extensions: ["fsc"]
  },
  "application/vnd.fujitsu.oasys": {
    source: "iana",
    extensions: ["oas"]
  },
  "application/vnd.fujitsu.oasys2": {
    source: "iana",
    extensions: ["oa2"]
  },
  "application/vnd.fujitsu.oasys3": {
    source: "iana",
    extensions: ["oa3"]
  },
  "application/vnd.fujitsu.oasysgp": {
    source: "iana",
    extensions: ["fg5"]
  },
  "application/vnd.fujitsu.oasysprs": {
    source: "iana",
    extensions: ["bh2"]
  },
  "application/vnd.fujixerox.ddd": {
    source: "iana",
    extensions: ["ddd"]
  },
  "application/vnd.fujixerox.docuworks": {
    source: "iana",
    extensions: ["xdw"]
  },
  "application/vnd.fujixerox.docuworks.binder": {
    source: "iana",
    extensions: ["xbd"]
  },
  "application/vnd.fuzzysheet": {
    source: "iana",
    extensions: ["fzs"]
  },
  "application/vnd.genomatix.tuxedo": {
    source: "iana",
    extensions: ["txd"]
  },
  "application/vnd.geogebra.file": {
    source: "iana",
    extensions: ["ggb"]
  },
  "application/vnd.geogebra.tool": {
    source: "iana",
    extensions: ["ggt"]
  },
  "application/vnd.geometry-explorer": {
    source: "iana",
    extensions: ["gex", "gre"]
  },
  "application/vnd.geonext": {
    source: "iana",
    extensions: ["gxt"]
  },
  "application/vnd.geoplan": {
    source: "iana",
    extensions: ["g2w"]
  },
  "application/vnd.geospace": {
    source: "iana",
    extensions: ["g3w"]
  },
  "application/vnd.gmx": {
    source: "iana",
    extensions: ["gmx"]
  },
  "application/vnd.google-earth.kml+xml": {
    source: "iana",
    extensions: ["kml"]
  },
  "application/vnd.google-earth.kmz": {
    source: "iana",
    extensions: ["kmz"]
  },
  "application/vnd.grafeq": {
    source: "iana",
    extensions: ["gqf", "gqs"]
  },
  "application/vnd.groove-account": {
    source: "iana",
    extensions: ["gac"]
  },
  "application/vnd.groove-help": {
    source: "iana",
    extensions: ["ghf"]
  },
  "application/vnd.groove-identity-message": {
    source: "iana",
    extensions: ["gim"]
  },
  "application/vnd.groove-injector": {
    source: "iana",
    extensions: ["grv"]
  },
  "application/vnd.groove-tool-message": {
    source: "iana",
    extensions: ["gtm"]
  },
  "application/vnd.groove-tool-template": {
    source: "iana",
    extensions: ["tpl"]
  },
  "application/vnd.groove-vcard": {
    source: "iana",
    extensions: ["vcg"]
  },
  "application/vnd.hal+xml": {
    source: "iana",
    extensions: ["hal"]
  },
  "application/vnd.handheld-entertainment+xml": {
    source: "iana",
    extensions: ["zmm"]
  },
  "application/vnd.hbci": {
    source: "iana",
    extensions: ["hbci"]
  },
  "application/vnd.hhe.lesson-player": {
    source: "iana",
    extensions: ["les"]
  },
  "application/vnd.hp-hpgl": {
    source: "iana",
    extensions: ["hpgl"]
  },
  "application/vnd.hp-hpid": {
    source: "iana",
    extensions: ["hpid"]
  },
  "application/vnd.hp-hps": {
    source: "iana",
    extensions: ["hps"]
  },
  "application/vnd.hp-jlyt": {
    source: "iana",
    extensions: ["jlt"]
  },
  "application/vnd.hp-pcl": {
    source: "iana",
    extensions: ["pcl"]
  },
  "application/vnd.hp-pclxl": {
    source: "iana",
    extensions: ["pclxl"]
  },
  "application/vnd.hydrostatix.sof-data": {
    source: "iana",
    extensions: ["sfd-hdstx"]
  },
  "application/vnd.ibm.minipay": {
    source: "iana",
    extensions: ["mpy"]
  },
  "application/vnd.ibm.modcap": {
    source: "iana",
    extensions: [
      "afp",
      "listafp",
      "list3820"
    ]
  },
  "application/vnd.ibm.rights-management": {
    source: "iana",
    extensions: ["irm"]
  },
  "application/vnd.ibm.secure-container": {
    source: "iana",
    extensions: ["sc"]
  },
  "application/vnd.iccprofile": {
    source: "iana",
    extensions: ["icc", "icm"]
  },
  "application/vnd.igloader": {
    source: "iana",
    extensions: ["igl"]
  },
  "application/vnd.immervision-ivp": {
    source: "iana",
    extensions: ["ivp"]
  },
  "application/vnd.immervision-ivu": {
    source: "iana",
    extensions: ["ivu"]
  },
  "application/vnd.insors.igm": {
    source: "iana",
    extensions: ["igm"]
  },
  "application/vnd.intercon.formnet": {
    source: "iana",
    extensions: ["xpw", "xpx"]
  },
  "application/vnd.intergeo": {
    source: "iana",
    extensions: ["i2g"]
  },
  "application/vnd.intu.qbo": {
    source: "iana",
    extensions: ["qbo"]
  },
  "application/vnd.intu.qfx": {
    source: "iana",
    extensions: ["qfx"]
  },
  "application/vnd.ipunplugged.rcprofile": {
    source: "iana",
    extensions: ["rcprofile"]
  },
  "application/vnd.irepository.package+xml": {
    source: "iana",
    extensions: ["irp"]
  },
  "application/vnd.is-xpr": {
    source: "iana",
    extensions: ["xpr"]
  },
  "application/vnd.isac.fcs": {
    source: "iana",
    extensions: ["fcs"]
  },
  "application/vnd.jam": {
    source: "iana",
    extensions: ["jam"]
  },
  "application/vnd.jcp.javame.midlet-rms": {
    source: "iana",
    extensions: ["rms"]
  },
  "application/vnd.jisp": {
    source: "iana",
    extensions: ["jisp"]
  },
  "application/vnd.joost.joda-archive": {
    source: "iana",
    extensions: ["joda"]
  },
  "application/vnd.kahootz": {
    source: "iana",
    extensions: ["ktz", "ktr"]
  },
  "application/vnd.kde.karbon": {
    source: "iana",
    extensions: ["karbon"]
  },
  "application/vnd.kde.kchart": {
    source: "iana",
    extensions: ["chrt"]
  },
  "application/vnd.kde.kformula": {
    source: "iana",
    extensions: ["kfo"]
  },
  "application/vnd.kde.kivio": {
    source: "iana",
    extensions: ["flw"]
  },
  "application/vnd.kde.kontour": {
    source: "iana",
    extensions: ["kon"]
  },
  "application/vnd.kde.kpresenter": {
    source: "iana",
    extensions: ["kpr", "kpt"]
  },
  "application/vnd.kde.kspread": {
    source: "iana",
    extensions: ["ksp"]
  },
  "application/vnd.kde.kword": {
    source: "iana",
    extensions: ["kwd", "kwt"]
  },
  "application/vnd.kenameaapp": {
    source: "iana",
    extensions: ["htke"]
  },
  "application/vnd.kidspiration": {
    source: "iana",
    extensions: ["kia"]
  },
  "application/vnd.kinar": {
    source: "iana",
    extensions: ["kne", "knp"]
  },
  "application/vnd.koan": {
    source: "iana",
    extensions: [
      "skp",
      "skd",
      "skt",
      "skm"
    ]
  },
  "application/vnd.kodak-descriptor": {
    source: "iana",
    extensions: ["sse"]
  },
  "application/vnd.las.las+xml": {
    source: "iana",
    extensions: ["lasxml"]
  },
  "application/vnd.llamagraphics.life-balance.desktop": {
    source: "iana",
    extensions: ["lbd"]
  },
  "application/vnd.llamagraphics.life-balance.exchange+xml": {
    source: "iana",
    extensions: ["lbe"]
  },
  "application/vnd.lotus-1-2-3": {
    source: "iana",
    extensions: ["123"]
  },
  "application/vnd.lotus-approach": {
    source: "iana",
    extensions: ["apr"]
  },
  "application/vnd.lotus-freelance": {
    source: "iana",
    extensions: ["pre"]
  },
  "application/vnd.lotus-notes": {
    source: "iana",
    extensions: ["nsf"]
  },
  "application/vnd.lotus-organizer": {
    source: "iana",
    extensions: ["org"]
  },
  "application/vnd.lotus-screencam": {
    source: "iana",
    extensions: ["scm"]
  },
  "application/vnd.lotus-wordpro": {
    source: "iana",
    extensions: ["lwp"]
  },
  "application/vnd.macports.portpkg": {
    source: "iana",
    extensions: ["portpkg"]
  },
  "application/vnd.mapbox-vector-tile": {
    source: "iana",
    extensions: ["mvt"]
  },
  "application/vnd.mcd": {
    source: "iana",
    extensions: ["mcd"]
  },
  "application/vnd.medcalcdata": {
    source: "iana",
    extensions: ["mc1"]
  },
  "application/vnd.mediastation.cdkey": {
    source: "iana",
    extensions: ["cdkey"]
  },
  "application/vnd.mfer": {
    source: "iana",
    extensions: ["mwf"]
  },
  "application/vnd.mfmp": {
    source: "iana",
    extensions: ["mfm"]
  },
  "application/vnd.micrografx.flo": {
    source: "iana",
    extensions: ["flo"]
  },
  "application/vnd.micrografx.igx": {
    source: "iana",
    extensions: ["igx"]
  },
  "application/vnd.mif": {
    source: "iana",
    extensions: ["mif"]
  },
  "application/vnd.mobius.daf": {
    source: "iana",
    extensions: ["daf"]
  },
  "application/vnd.mobius.dis": {
    source: "iana",
    extensions: ["dis"]
  },
  "application/vnd.mobius.mbk": {
    source: "iana",
    extensions: ["mbk"]
  },
  "application/vnd.mobius.mqy": {
    source: "iana",
    extensions: ["mqy"]
  },
  "application/vnd.mobius.msl": {
    source: "iana",
    extensions: ["msl"]
  },
  "application/vnd.mobius.plc": {
    source: "iana",
    extensions: ["plc"]
  },
  "application/vnd.mobius.txf": {
    source: "iana",
    extensions: ["txf"]
  },
  "application/vnd.mophun.application": {
    source: "iana",
    extensions: ["mpn"]
  },
  "application/vnd.mophun.certificate": {
    source: "iana",
    extensions: ["mpc"]
  },
  "application/vnd.mozilla.xul+xml": {
    source: "iana",
    extensions: ["xul"]
  },
  "application/vnd.ms-artgalry": {
    source: "iana",
    extensions: ["cil"]
  },
  "application/vnd.ms-cab-compressed": {
    source: "iana",
    extensions: ["cab"]
  },
  "application/vnd.ms-excel": {
    source: "iana",
    extensions: [
      "xls",
      "xlm",
      "xla",
      "xlc",
      "xlt",
      "xlw"
    ]
  },
  "application/vnd.ms-excel.addin.macroenabled.12": {
    source: "iana",
    extensions: ["xlam"]
  },
  "application/vnd.ms-excel.sheet.binary.macroenabled.12": {
    source: "iana",
    extensions: ["xlsb"]
  },
  "application/vnd.ms-excel.sheet.macroenabled.12": {
    source: "iana",
    extensions: ["xlsm"]
  },
  "application/vnd.ms-excel.template.macroenabled.12": {
    source: "iana",
    extensions: ["xltm"]
  },
  "application/vnd.ms-fontobject": {
    source: "iana",
    extensions: ["eot"]
  },
  "application/vnd.ms-htmlhelp": {
    source: "iana",
    extensions: ["chm"]
  },
  "application/vnd.ms-ims": {
    source: "iana",
    extensions: ["ims"]
  },
  "application/vnd.ms-lrm": {
    source: "iana",
    extensions: ["lrm"]
  },
  "application/vnd.ms-officetheme": {
    source: "iana",
    extensions: ["thmx"]
  },
  "application/vnd.ms-pki.seccat": {
    source: "apache",
    extensions: ["cat"]
  },
  "application/vnd.ms-pki.stl": {
    source: "apache",
    extensions: ["stl"]
  },
  "application/vnd.ms-powerpoint": {
    source: "iana",
    extensions: [
      "ppt",
      "pps",
      "pot"
    ]
  },
  "application/vnd.ms-powerpoint.addin.macroenabled.12": {
    source: "iana",
    extensions: ["ppam"]
  },
  "application/vnd.ms-powerpoint.presentation.macroenabled.12": {
    source: "iana",
    extensions: ["pptm"]
  },
  "application/vnd.ms-powerpoint.slide.macroenabled.12": {
    source: "iana",
    extensions: ["sldm"]
  },
  "application/vnd.ms-powerpoint.slideshow.macroenabled.12": {
    source: "iana",
    extensions: ["ppsm"]
  },
  "application/vnd.ms-powerpoint.template.macroenabled.12": {
    source: "iana",
    extensions: ["potm"]
  },
  "application/vnd.ms-project": {
    source: "iana",
    extensions: ["mpp", "mpt"]
  },
  "application/vnd.ms-word.document.macroenabled.12": {
    source: "iana",
    extensions: ["docm"]
  },
  "application/vnd.ms-word.template.macroenabled.12": {
    source: "iana",
    extensions: ["dotm"]
  },
  "application/vnd.ms-works": {
    source: "iana",
    extensions: [
      "wps",
      "wks",
      "wcm",
      "wdb"
    ]
  },
  "application/vnd.ms-wpl": {
    source: "iana",
    extensions: ["wpl"]
  },
  "application/vnd.ms-xpsdocument": {
    source: "iana",
    extensions: ["xps"]
  },
  "application/vnd.mseq": {
    source: "iana",
    extensions: ["mseq"]
  },
  "application/vnd.musician": {
    source: "iana",
    extensions: ["mus"]
  },
  "application/vnd.muvee.style": {
    source: "iana",
    extensions: ["msty"]
  },
  "application/vnd.mynfc": {
    source: "iana",
    extensions: ["taglet"]
  },
  "application/vnd.neurolanguage.nlu": {
    source: "iana",
    extensions: ["nlu"]
  },
  "application/vnd.nitf": {
    source: "iana",
    extensions: ["ntf", "nitf"]
  },
  "application/vnd.noblenet-directory": {
    source: "iana",
    extensions: ["nnd"]
  },
  "application/vnd.noblenet-sealer": {
    source: "iana",
    extensions: ["nns"]
  },
  "application/vnd.noblenet-web": {
    source: "iana",
    extensions: ["nnw"]
  },
  "application/vnd.nokia.n-gage.ac+xml": {
    source: "iana",
    extensions: ["ac"]
  },
  "application/vnd.nokia.n-gage.data": {
    source: "iana",
    extensions: ["ngdat"]
  },
  "application/vnd.nokia.n-gage.symbian.install": {
    source: "iana",
    extensions: ["n-gage"]
  },
  "application/vnd.nokia.radio-preset": {
    source: "iana",
    extensions: ["rpst"]
  },
  "application/vnd.nokia.radio-presets": {
    source: "iana",
    extensions: ["rpss"]
  },
  "application/vnd.novadigm.edm": {
    source: "iana",
    extensions: ["edm"]
  },
  "application/vnd.novadigm.edx": {
    source: "iana",
    extensions: ["edx"]
  },
  "application/vnd.novadigm.ext": {
    source: "iana",
    extensions: ["ext"]
  },
  "application/vnd.oasis.opendocument.chart": {
    source: "iana",
    extensions: ["odc"]
  },
  "application/vnd.oasis.opendocument.chart-template": {
    source: "iana",
    extensions: ["otc"]
  },
  "application/vnd.oasis.opendocument.database": {
    source: "iana",
    extensions: ["odb"]
  },
  "application/vnd.oasis.opendocument.formula": {
    source: "iana",
    extensions: ["odf"]
  },
  "application/vnd.oasis.opendocument.formula-template": {
    source: "iana",
    extensions: ["odft"]
  },
  "application/vnd.oasis.opendocument.graphics": {
    source: "iana",
    extensions: ["odg"]
  },
  "application/vnd.oasis.opendocument.graphics-template": {
    source: "iana",
    extensions: ["otg"]
  },
  "application/vnd.oasis.opendocument.image": {
    source: "iana",
    extensions: ["odi"]
  },
  "application/vnd.oasis.opendocument.image-template": {
    source: "iana",
    extensions: ["oti"]
  },
  "application/vnd.oasis.opendocument.presentation": {
    source: "iana",
    extensions: ["odp"]
  },
  "application/vnd.oasis.opendocument.presentation-template": {
    source: "iana",
    extensions: ["otp"]
  },
  "application/vnd.oasis.opendocument.spreadsheet": {
    source: "iana",
    extensions: ["ods"]
  },
  "application/vnd.oasis.opendocument.spreadsheet-template": {
    source: "iana",
    extensions: ["ots"]
  },
  "application/vnd.oasis.opendocument.text": {
    source: "iana",
    extensions: ["odt"]
  },
  "application/vnd.oasis.opendocument.text-master": {
    source: "iana",
    extensions: ["odm"]
  },
  "application/vnd.oasis.opendocument.text-template": {
    source: "iana",
    extensions: ["ott"]
  },
  "application/vnd.oasis.opendocument.text-web": {
    source: "iana",
    extensions: ["oth"]
  },
  "application/vnd.olpc-sugar": {
    source: "iana",
    extensions: ["xo"]
  },
  "application/vnd.oma.dd2+xml": {
    source: "iana",
    extensions: ["dd2"]
  },
  "application/vnd.openblox.game+xml": {
    source: "iana",
    extensions: ["obgx"]
  },
  "application/vnd.openofficeorg.extension": {
    source: "apache",
    extensions: ["oxt"]
  },
  "application/vnd.openstreetmap.data+xml": {
    source: "iana",
    extensions: ["osm"]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    source: "iana",
    extensions: ["pptx"]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slide": {
    source: "iana",
    extensions: ["sldx"]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow": {
    source: "iana",
    extensions: ["ppsx"]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.template": {
    source: "iana",
    extensions: ["potx"]
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    source: "iana",
    extensions: ["xlsx"]
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template": {
    source: "iana",
    extensions: ["xltx"]
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    source: "iana",
    extensions: ["docx"]
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template": {
    source: "iana",
    extensions: ["dotx"]
  },
  "application/vnd.osgeo.mapguide.package": {
    source: "iana",
    extensions: ["mgp"]
  },
  "application/vnd.osgi.dp": {
    source: "iana",
    extensions: ["dp"]
  },
  "application/vnd.osgi.subsystem": {
    source: "iana",
    extensions: ["esa"]
  },
  "application/vnd.palm": {
    source: "iana",
    extensions: [
      "pdb",
      "pqa",
      "oprc"
    ]
  },
  "application/vnd.pawaafile": {
    source: "iana",
    extensions: ["paw"]
  },
  "application/vnd.pg.format": {
    source: "iana",
    extensions: ["str"]
  },
  "application/vnd.pg.osasli": {
    source: "iana",
    extensions: ["ei6"]
  },
  "application/vnd.picsel": {
    source: "iana",
    extensions: ["efif"]
  },
  "application/vnd.pmi.widget": {
    source: "iana",
    extensions: ["wg"]
  },
  "application/vnd.pocketlearn": {
    source: "iana",
    extensions: ["plf"]
  },
  "application/vnd.powerbuilder6": {
    source: "iana",
    extensions: ["pbd"]
  },
  "application/vnd.previewsystems.box": {
    source: "iana",
    extensions: ["box"]
  },
  "application/vnd.proteus.magazine": {
    source: "iana",
    extensions: ["mgz"]
  },
  "application/vnd.publishare-delta-tree": {
    source: "iana",
    extensions: ["qps"]
  },
  "application/vnd.pvi.ptid1": {
    source: "iana",
    extensions: ["ptid"]
  },
  "application/vnd.quark.quarkxpress": {
    source: "iana",
    extensions: [
      "qxd",
      "qxt",
      "qwd",
      "qwt",
      "qxl",
      "qxb"
    ]
  },
  "application/vnd.rar": {
    source: "iana",
    extensions: ["rar"]
  },
  "application/vnd.realvnc.bed": {
    source: "iana",
    extensions: ["bed"]
  },
  "application/vnd.recordare.musicxml": {
    source: "iana",
    extensions: ["mxl"]
  },
  "application/vnd.recordare.musicxml+xml": {
    source: "iana",
    extensions: ["musicxml"]
  },
  "application/vnd.rig.cryptonote": {
    source: "iana",
    extensions: ["cryptonote"]
  },
  "application/vnd.rim.cod": {
    source: "apache",
    extensions: ["cod"]
  },
  "application/vnd.rn-realmedia": {
    source: "apache",
    extensions: ["rm"]
  },
  "application/vnd.rn-realmedia-vbr": {
    source: "apache",
    extensions: ["rmvb"]
  },
  "application/vnd.route66.link66+xml": {
    source: "iana",
    extensions: ["link66"]
  },
  "application/vnd.sailingtracker.track": {
    source: "iana",
    extensions: ["st"]
  },
  "application/vnd.seemail": {
    source: "iana",
    extensions: ["see"]
  },
  "application/vnd.sema": {
    source: "iana",
    extensions: ["sema"]
  },
  "application/vnd.semd": {
    source: "iana",
    extensions: ["semd"]
  },
  "application/vnd.semf": {
    source: "iana",
    extensions: ["semf"]
  },
  "application/vnd.shana.informed.formdata": {
    source: "iana",
    extensions: ["ifm"]
  },
  "application/vnd.shana.informed.formtemplate": {
    source: "iana",
    extensions: ["itp"]
  },
  "application/vnd.shana.informed.interchange": {
    source: "iana",
    extensions: ["iif"]
  },
  "application/vnd.shana.informed.package": {
    source: "iana",
    extensions: ["ipk"]
  },
  "application/vnd.simtech-mindmapper": {
    source: "iana",
    extensions: ["twd", "twds"]
  },
  "application/vnd.smaf": {
    source: "iana",
    extensions: ["mmf"]
  },
  "application/vnd.smart.teacher": {
    source: "iana",
    extensions: ["teacher"]
  },
  "application/vnd.software602.filler.form+xml": {
    source: "iana",
    extensions: ["fo"]
  },
  "application/vnd.solent.sdkm+xml": {
    source: "iana",
    extensions: ["sdkm", "sdkd"]
  },
  "application/vnd.spotfire.dxp": {
    source: "iana",
    extensions: ["dxp"]
  },
  "application/vnd.spotfire.sfs": {
    source: "iana",
    extensions: ["sfs"]
  },
  "application/vnd.stardivision.calc": {
    source: "apache",
    extensions: ["sdc"]
  },
  "application/vnd.stardivision.draw": {
    source: "apache",
    extensions: ["sda"]
  },
  "application/vnd.stardivision.impress": {
    source: "apache",
    extensions: ["sdd"]
  },
  "application/vnd.stardivision.math": {
    source: "apache",
    extensions: ["smf"]
  },
  "application/vnd.stardivision.writer": {
    source: "apache",
    extensions: ["sdw", "vor"]
  },
  "application/vnd.stardivision.writer-global": {
    source: "apache",
    extensions: ["sgl"]
  },
  "application/vnd.stepmania.package": {
    source: "iana",
    extensions: ["smzip"]
  },
  "application/vnd.stepmania.stepchart": {
    source: "iana",
    extensions: ["sm"]
  },
  "application/vnd.sun.wadl+xml": {
    source: "iana",
    extensions: ["wadl"]
  },
  "application/vnd.sun.xml.calc": {
    source: "apache",
    extensions: ["sxc"]
  },
  "application/vnd.sun.xml.calc.template": {
    source: "apache",
    extensions: ["stc"]
  },
  "application/vnd.sun.xml.draw": {
    source: "apache",
    extensions: ["sxd"]
  },
  "application/vnd.sun.xml.draw.template": {
    source: "apache",
    extensions: ["std"]
  },
  "application/vnd.sun.xml.impress": {
    source: "apache",
    extensions: ["sxi"]
  },
  "application/vnd.sun.xml.impress.template": {
    source: "apache",
    extensions: ["sti"]
  },
  "application/vnd.sun.xml.math": {
    source: "apache",
    extensions: ["sxm"]
  },
  "application/vnd.sun.xml.writer": {
    source: "apache",
    extensions: ["sxw"]
  },
  "application/vnd.sun.xml.writer.global": {
    source: "apache",
    extensions: ["sxg"]
  },
  "application/vnd.sun.xml.writer.template": {
    source: "apache",
    extensions: ["stw"]
  },
  "application/vnd.sus-calendar": {
    source: "iana",
    extensions: ["sus", "susp"]
  },
  "application/vnd.svd": {
    source: "iana",
    extensions: ["svd"]
  },
  "application/vnd.symbian.install": {
    source: "apache",
    extensions: ["sis", "sisx"]
  },
  "application/vnd.syncml+xml": {
    source: "iana",
    charset: "UTF-8",
    extensions: ["xsm"]
  },
  "application/vnd.syncml.dm+wbxml": {
    source: "iana",
    charset: "UTF-8",
    extensions: ["bdm"]
  },
  "application/vnd.syncml.dm+xml": {
    source: "iana",
    charset: "UTF-8",
    extensions: ["xdm"]
  },
  "application/vnd.syncml.dmddf+xml": {
    source: "iana",
    charset: "UTF-8",
    extensions: ["ddf"]
  },
  "application/vnd.tao.intent-module-archive": {
    source: "iana",
    extensions: ["tao"]
  },
  "application/vnd.tcpdump.pcap": {
    source: "iana",
    extensions: [
      "pcap",
      "cap",
      "dmp"
    ]
  },
  "application/vnd.tmobile-livetv": {
    source: "iana",
    extensions: ["tmo"]
  },
  "application/vnd.trid.tpt": {
    source: "iana",
    extensions: ["tpt"]
  },
  "application/vnd.triscape.mxs": {
    source: "iana",
    extensions: ["mxs"]
  },
  "application/vnd.trueapp": {
    source: "iana",
    extensions: ["tra"]
  },
  "application/vnd.ufdl": {
    source: "iana",
    extensions: ["ufd", "ufdl"]
  },
  "application/vnd.uiq.theme": {
    source: "iana",
    extensions: ["utz"]
  },
  "application/vnd.umajin": {
    source: "iana",
    extensions: ["umj"]
  },
  "application/vnd.unity": {
    source: "iana",
    extensions: ["unityweb"]
  },
  "application/vnd.uoml+xml": {
    source: "iana",
    extensions: ["uoml"]
  },
  "application/vnd.vcx": {
    source: "iana",
    extensions: ["vcx"]
  },
  "application/vnd.visio": {
    source: "iana",
    extensions: [
      "vsd",
      "vst",
      "vss",
      "vsw"
    ]
  },
  "application/vnd.visionary": {
    source: "iana",
    extensions: ["vis"]
  },
  "application/vnd.vsf": {
    source: "iana",
    extensions: ["vsf"]
  },
  "application/vnd.wap.wbxml": {
    source: "iana",
    charset: "UTF-8",
    extensions: ["wbxml"]
  },
  "application/vnd.wap.wmlc": {
    source: "iana",
    extensions: ["wmlc"]
  },
  "application/vnd.wap.wmlscriptc": {
    source: "iana",
    extensions: ["wmlsc"]
  },
  "application/vnd.webturbo": {
    source: "iana",
    extensions: ["wtb"]
  },
  "application/vnd.wolfram.player": {
    source: "iana",
    extensions: ["nbp"]
  },
  "application/vnd.wordperfect": {
    source: "iana",
    extensions: ["wpd"]
  },
  "application/vnd.wqd": {
    source: "iana",
    extensions: ["wqd"]
  },
  "application/vnd.wt.stf": {
    source: "iana",
    extensions: ["stf"]
  },
  "application/vnd.xara": {
    source: "iana",
    extensions: ["xar"]
  },
  "application/vnd.xfdl": {
    source: "iana",
    extensions: ["xfdl"]
  },
  "application/vnd.yamaha.hv-dic": {
    source: "iana",
    extensions: ["hvd"]
  },
  "application/vnd.yamaha.hv-script": {
    source: "iana",
    extensions: ["hvs"]
  },
  "application/vnd.yamaha.hv-voice": {
    source: "iana",
    extensions: ["hvp"]
  },
  "application/vnd.yamaha.openscoreformat": {
    source: "iana",
    extensions: ["osf"]
  },
  "application/vnd.yamaha.openscoreformat.osfpvg+xml": {
    source: "iana",
    extensions: ["osfpvg"]
  },
  "application/vnd.yamaha.smaf-audio": {
    source: "iana",
    extensions: ["saf"]
  },
  "application/vnd.yamaha.smaf-phrase": {
    source: "iana",
    extensions: ["spf"]
  },
  "application/vnd.yellowriver-custom-menu": {
    source: "iana",
    extensions: ["cmp"]
  },
  "application/vnd.zul": {
    source: "iana",
    extensions: ["zir", "zirz"]
  },
  "application/vnd.zzazz.deck+xml": {
    source: "iana",
    extensions: ["zaz"]
  },
  "application/voicexml+xml": {
    source: "iana",
    extensions: ["vxml"]
  },
  "application/wasm": {
    source: "iana",
    extensions: ["wasm"]
  },
  "application/watcherinfo+xml": {
    source: "iana",
    extensions: ["wif"]
  },
  "application/widget": {
    source: "iana",
    extensions: ["wgt"]
  },
  "application/winhlp": {
    source: "apache",
    extensions: ["hlp"]
  },
  "application/wsdl+xml": {
    source: "iana",
    extensions: ["wsdl"]
  },
  "application/wspolicy+xml": {
    source: "iana",
    extensions: ["wspolicy"]
  },
  "application/x-7z-compressed": {
    source: "apache",
    extensions: ["7z"]
  },
  "application/x-abiword": {
    source: "apache",
    extensions: ["abw"]
  },
  "application/x-ace-compressed": {
    source: "apache",
    extensions: ["ace"]
  },
  "application/x-apple-diskimage": {
    source: "apache",
    extensions: ["dmg"]
  },
  "application/x-authorware-bin": {
    source: "apache",
    extensions: [
      "aab",
      "x32",
      "u32",
      "vox"
    ]
  },
  "application/x-authorware-map": {
    source: "apache",
    extensions: ["aam"]
  },
  "application/x-authorware-seg": {
    source: "apache",
    extensions: ["aas"]
  },
  "application/x-bcpio": {
    source: "apache",
    extensions: ["bcpio"]
  },
  "application/x-bittorrent": {
    source: "apache",
    extensions: ["torrent"]
  },
  "application/x-blorb": {
    source: "apache",
    extensions: ["blb", "blorb"]
  },
  "application/x-bzip": {
    source: "apache",
    extensions: ["bz"]
  },
  "application/x-bzip2": {
    source: "apache",
    extensions: ["bz2", "boz"]
  },
  "application/x-cbr": {
    source: "apache",
    extensions: [
      "cbr",
      "cba",
      "cbt",
      "cbz",
      "cb7"
    ]
  },
  "application/x-cdlink": {
    source: "apache",
    extensions: ["vcd"]
  },
  "application/x-cfs-compressed": {
    source: "apache",
    extensions: ["cfs"]
  },
  "application/x-chat": {
    source: "apache",
    extensions: ["chat"]
  },
  "application/x-chess-pgn": {
    source: "apache",
    extensions: ["pgn"]
  },
  "application/x-cocoa": {
    source: "nginx",
    extensions: ["cco"]
  },
  "application/x-conference": {
    source: "apache",
    extensions: ["nsc"]
  },
  "application/x-cpio": {
    source: "apache",
    extensions: ["cpio"]
  },
  "application/x-csh": {
    source: "apache",
    extensions: ["csh"]
  },
  "application/x-debian-package": {
    source: "apache",
    extensions: ["deb", "udeb"]
  },
  "application/x-dgc-compressed": {
    source: "apache",
    extensions: ["dgc"]
  },
  "application/x-director": {
    source: "apache",
    extensions: [
      "dir",
      "dcr",
      "dxr",
      "cst",
      "cct",
      "cxt",
      "w3d",
      "fgd",
      "swa"
    ]
  },
  "application/x-doom": {
    source: "apache",
    extensions: ["wad"]
  },
  "application/x-dtbncx+xml": {
    source: "apache",
    extensions: ["ncx"]
  },
  "application/x-dtbook+xml": {
    source: "apache",
    extensions: ["dtb"]
  },
  "application/x-dtbresource+xml": {
    source: "apache",
    extensions: ["res"]
  },
  "application/x-dvi": {
    source: "apache",
    extensions: ["dvi"]
  },
  "application/x-envoy": {
    source: "apache",
    extensions: ["evy"]
  },
  "application/x-eva": {
    source: "apache",
    extensions: ["eva"]
  },
  "application/x-font-bdf": {
    source: "apache",
    extensions: ["bdf"]
  },
  "application/x-font-ghostscript": {
    source: "apache",
    extensions: ["gsf"]
  },
  "application/x-font-linux-psf": {
    source: "apache",
    extensions: ["psf"]
  },
  "application/x-font-pcf": {
    source: "apache",
    extensions: ["pcf"]
  },
  "application/x-font-snf": {
    source: "apache",
    extensions: ["snf"]
  },
  "application/x-font-type1": {
    source: "apache",
    extensions: [
      "pfa",
      "pfb",
      "pfm",
      "afm"
    ]
  },
  "application/x-freearc": {
    source: "apache",
    extensions: ["arc"]
  },
  "application/x-futuresplash": {
    source: "apache",
    extensions: ["spl"]
  },
  "application/x-gca-compressed": {
    source: "apache",
    extensions: ["gca"]
  },
  "application/x-glulx": {
    source: "apache",
    extensions: ["ulx"]
  },
  "application/x-gnumeric": {
    source: "apache",
    extensions: ["gnumeric"]
  },
  "application/x-gramps-xml": {
    source: "apache",
    extensions: ["gramps"]
  },
  "application/x-gtar": {
    source: "apache",
    extensions: ["gtar"]
  },
  "application/x-hdf": {
    source: "apache",
    extensions: ["hdf"]
  },
  "application/x-install-instructions": {
    source: "apache",
    extensions: ["install"]
  },
  "application/x-iso9660-image": {
    source: "apache",
    extensions: ["iso"]
  },
  "application/x-java-archive-diff": {
    source: "nginx",
    extensions: ["jardiff"]
  },
  "application/x-java-jnlp-file": {
    source: "apache",
    extensions: ["jnlp"]
  },
  "application/x-latex": {
    source: "apache",
    extensions: ["latex"]
  },
  "application/x-lzh-compressed": {
    source: "apache",
    extensions: ["lzh", "lha"]
  },
  "application/x-makeself": {
    source: "nginx",
    extensions: ["run"]
  },
  "application/x-mie": {
    source: "apache",
    extensions: ["mie"]
  },
  "application/x-mobipocket-ebook": {
    source: "apache",
    extensions: ["prc", "mobi"]
  },
  "application/x-ms-application": {
    source: "apache",
    extensions: ["application"]
  },
  "application/x-ms-shortcut": {
    source: "apache",
    extensions: ["lnk"]
  },
  "application/x-ms-wmd": {
    source: "apache",
    extensions: ["wmd"]
  },
  "application/x-ms-wmz": {
    source: "apache",
    extensions: ["wmz"]
  },
  "application/x-ms-xbap": {
    source: "apache",
    extensions: ["xbap"]
  },
  "application/x-msaccess": {
    source: "apache",
    extensions: ["mdb"]
  },
  "application/x-msbinder": {
    source: "apache",
    extensions: ["obd"]
  },
  "application/x-mscardfile": {
    source: "apache",
    extensions: ["crd"]
  },
  "application/x-msclip": {
    source: "apache",
    extensions: ["clp"]
  },
  "application/x-msdownload": {
    source: "apache",
    extensions: [
      "exe",
      "dll",
      "com",
      "bat",
      "msi"
    ]
  },
  "application/x-msmediaview": {
    source: "apache",
    extensions: [
      "mvb",
      "m13",
      "m14"
    ]
  },
  "application/x-msmetafile": {
    source: "apache",
    extensions: [
      "wmf",
      "wmz",
      "emf",
      "emz"
    ]
  },
  "application/x-msmoney": {
    source: "apache",
    extensions: ["mny"]
  },
  "application/x-mspublisher": {
    source: "apache",
    extensions: ["pub"]
  },
  "application/x-msschedule": {
    source: "apache",
    extensions: ["scd"]
  },
  "application/x-msterminal": {
    source: "apache",
    extensions: ["trm"]
  },
  "application/x-mswrite": {
    source: "apache",
    extensions: ["wri"]
  },
  "application/x-netcdf": {
    source: "apache",
    extensions: ["nc", "cdf"]
  },
  "application/x-nzb": {
    source: "apache",
    extensions: ["nzb"]
  },
  "application/x-perl": {
    source: "nginx",
    extensions: ["pl", "pm"]
  },
  "application/x-pilot": {
    source: "nginx",
    extensions: ["prc", "pdb"]
  },
  "application/x-pkcs12": {
    source: "apache",
    extensions: ["p12", "pfx"]
  },
  "application/x-pkcs7-certificates": {
    source: "apache",
    extensions: ["p7b", "spc"]
  },
  "application/x-pkcs7-certreqresp": {
    source: "apache",
    extensions: ["p7r"]
  },
  "application/x-rar-compressed": {
    source: "apache",
    extensions: ["rar"]
  },
  "application/x-redhat-package-manager": {
    source: "nginx",
    extensions: ["rpm"]
  },
  "application/x-research-info-systems": {
    source: "apache",
    extensions: ["ris"]
  },
  "application/x-sea": {
    source: "nginx",
    extensions: ["sea"]
  },
  "application/x-sh": {
    source: "apache",
    extensions: ["sh"]
  },
  "application/x-shar": {
    source: "apache",
    extensions: ["shar"]
  },
  "application/x-shockwave-flash": {
    source: "apache",
    extensions: ["swf"]
  },
  "application/x-silverlight-app": {
    source: "apache",
    extensions: ["xap"]
  },
  "application/x-sql": {
    source: "apache",
    extensions: ["sql"]
  },
  "application/x-stuffit": {
    source: "apache",
    extensions: ["sit"]
  },
  "application/x-stuffitx": {
    source: "apache",
    extensions: ["sitx"]
  },
  "application/x-subrip": {
    source: "apache",
    extensions: ["srt"]
  },
  "application/x-sv4cpio": {
    source: "apache",
    extensions: ["sv4cpio"]
  },
  "application/x-sv4crc": {
    source: "apache",
    extensions: ["sv4crc"]
  },
  "application/x-t3vm-image": {
    source: "apache",
    extensions: ["t3"]
  },
  "application/x-tads": {
    source: "apache",
    extensions: ["gam"]
  },
  "application/x-tar": {
    source: "apache",
    extensions: ["tar"]
  },
  "application/x-tcl": {
    source: "apache",
    extensions: ["tcl", "tk"]
  },
  "application/x-tex": {
    source: "apache",
    extensions: ["tex"]
  },
  "application/x-tex-tfm": {
    source: "apache",
    extensions: ["tfm"]
  },
  "application/x-texinfo": {
    source: "apache",
    extensions: ["texinfo", "texi"]
  },
  "application/x-tgif": {
    source: "apache",
    extensions: ["obj"]
  },
  "application/x-ustar": {
    source: "apache",
    extensions: ["ustar"]
  },
  "application/x-wais-source": {
    source: "apache",
    extensions: ["src"]
  },
  "application/x-x509-ca-cert": {
    source: "iana",
    extensions: [
      "der",
      "crt",
      "pem"
    ]
  },
  "application/x-xfig": {
    source: "apache",
    extensions: ["fig"]
  },
  "application/x-xliff+xml": {
    source: "apache",
    extensions: ["xlf"]
  },
  "application/x-xpinstall": {
    source: "apache",
    extensions: ["xpi"]
  },
  "application/x-xz": {
    source: "apache",
    extensions: ["xz"]
  },
  "application/x-zmachine": {
    source: "apache",
    extensions: [
      "z1",
      "z2",
      "z3",
      "z4",
      "z5",
      "z6",
      "z7",
      "z8"
    ]
  },
  "application/xaml+xml": {
    source: "apache",
    extensions: ["xaml"]
  },
  "application/xcap-att+xml": {
    source: "iana",
    extensions: ["xav"]
  },
  "application/xcap-caps+xml": {
    source: "iana",
    extensions: ["xca"]
  },
  "application/xcap-diff+xml": {
    source: "iana",
    extensions: ["xdf"]
  },
  "application/xcap-el+xml": {
    source: "iana",
    extensions: ["xel"]
  },
  "application/xcap-ns+xml": {
    source: "iana",
    extensions: ["xns"]
  },
  "application/xenc+xml": {
    source: "iana",
    extensions: ["xenc"]
  },
  "application/xhtml+xml": {
    source: "iana",
    extensions: ["xhtml", "xht"]
  },
  "application/xliff+xml": {
    source: "iana",
    extensions: ["xlf"]
  },
  "application/xml": {
    source: "iana",
    extensions: [
      "xml",
      "xsl",
      "xsd",
      "rng"
    ]
  },
  "application/xml-dtd": {
    source: "iana",
    extensions: ["dtd"]
  },
  "application/xop+xml": {
    source: "iana",
    extensions: ["xop"]
  },
  "application/xproc+xml": {
    source: "apache",
    extensions: ["xpl"]
  },
  "application/xslt+xml": {
    source: "iana",
    extensions: ["xsl", "xslt"]
  },
  "application/xspf+xml": {
    source: "apache",
    extensions: ["xspf"]
  },
  "application/xv+xml": {
    source: "iana",
    extensions: [
      "mxml",
      "xhvml",
      "xvml",
      "xvm"
    ]
  },
  "application/yaml": {
    source: "iana",
    extensions: ["yaml", "yml"]
  },
  "application/yang": {
    source: "iana",
    extensions: ["yang"]
  },
  "application/yin+xml": {
    source: "iana",
    extensions: ["yin"]
  },
  "application/zip": {
    source: "iana",
    extensions: ["zip"]
  }
};

// node_modules/@uploadthing/mime-types/dist/audio-abtNcU0_.js
var audio = {
  "audio/3gpp": {
    source: "iana",
    extensions: ["3gpp"]
  },
  "audio/adpcm": {
    source: "apache",
    extensions: ["adp"]
  },
  "audio/amr": {
    source: "iana",
    extensions: ["amr"]
  },
  "audio/basic": {
    source: "iana",
    extensions: ["au", "snd"]
  },
  "audio/midi": {
    source: "apache",
    extensions: [
      "mid",
      "midi",
      "kar",
      "rmi"
    ]
  },
  "audio/mobile-xmf": {
    source: "iana",
    extensions: ["mxmf"]
  },
  "audio/mp4": {
    source: "iana",
    extensions: ["m4a", "mp4a"]
  },
  "audio/mpeg": {
    source: "iana",
    extensions: [
      "mpga",
      "mp2",
      "mp2a",
      "mp3",
      "m2a",
      "m3a"
    ]
  },
  "audio/ogg": {
    source: "iana",
    extensions: [
      "oga",
      "ogg",
      "spx",
      "opus"
    ]
  },
  "audio/s3m": {
    source: "apache",
    extensions: ["s3m"]
  },
  "audio/silk": {
    source: "apache",
    extensions: ["sil"]
  },
  "audio/vnd.dece.audio": {
    source: "iana",
    extensions: ["uva", "uvva"]
  },
  "audio/vnd.digital-winds": {
    source: "iana",
    extensions: ["eol"]
  },
  "audio/vnd.dra": {
    source: "iana",
    extensions: ["dra"]
  },
  "audio/vnd.dts": {
    source: "iana",
    extensions: ["dts"]
  },
  "audio/vnd.dts.hd": {
    source: "iana",
    extensions: ["dtshd"]
  },
  "audio/vnd.lucent.voice": {
    source: "iana",
    extensions: ["lvp"]
  },
  "audio/vnd.ms-playready.media.pya": {
    source: "iana",
    extensions: ["pya"]
  },
  "audio/vnd.nuera.ecelp4800": {
    source: "iana",
    extensions: ["ecelp4800"]
  },
  "audio/vnd.nuera.ecelp7470": {
    source: "iana",
    extensions: ["ecelp7470"]
  },
  "audio/vnd.nuera.ecelp9600": {
    source: "iana",
    extensions: ["ecelp9600"]
  },
  "audio/vnd.rip": {
    source: "iana",
    extensions: ["rip"]
  },
  "audio/webm": {
    source: "apache",
    extensions: ["weba"]
  },
  "audio/x-aac": {
    source: "apache",
    extensions: ["aac"]
  },
  "audio/x-aiff": {
    source: "apache",
    extensions: [
      "aif",
      "aiff",
      "aifc"
    ]
  },
  "audio/x-caf": {
    source: "apache",
    extensions: ["caf"]
  },
  "audio/x-flac": {
    source: "apache",
    extensions: ["flac"]
  },
  "audio/x-m4a": {
    source: "nginx",
    extensions: ["m4a"]
  },
  "audio/x-matroska": {
    source: "apache",
    extensions: ["mka"]
  },
  "audio/x-mpegurl": {
    source: "apache",
    extensions: ["m3u"]
  },
  "audio/x-ms-wax": {
    source: "apache",
    extensions: ["wax"]
  },
  "audio/x-ms-wma": {
    source: "apache",
    extensions: ["wma"]
  },
  "audio/x-pn-realaudio": {
    source: "apache",
    extensions: ["ram", "ra"]
  },
  "audio/x-pn-realaudio-plugin": {
    source: "apache",
    extensions: ["rmp"]
  },
  "audio/x-realaudio": {
    source: "nginx",
    extensions: ["ra"]
  },
  "audio/x-wav": {
    source: "apache",
    extensions: ["wav"]
  },
  "audio/x-gsm": {
    source: "apache",
    extensions: ["gsm"]
  },
  "audio/xm": {
    source: "apache",
    extensions: ["xm"]
  }
};

// node_modules/@uploadthing/mime-types/dist/image-C05IP6qt.js
var image = {
  "image/aces": {
    source: "iana",
    extensions: ["exr"]
  },
  "image/avci": {
    source: "iana",
    extensions: ["avci"]
  },
  "image/avcs": {
    source: "iana",
    extensions: ["avcs"]
  },
  "image/avif": {
    source: "iana",
    extensions: ["avif"]
  },
  "image/bmp": {
    source: "iana",
    extensions: ["bmp"]
  },
  "image/cgm": {
    source: "iana",
    extensions: ["cgm"]
  },
  "image/dicom-rle": {
    source: "iana",
    extensions: ["drle"]
  },
  "image/emf": {
    source: "iana",
    extensions: ["emf"]
  },
  "image/fits": {
    source: "iana",
    extensions: ["fits"]
  },
  "image/g3fax": {
    source: "iana",
    extensions: ["g3"]
  },
  "image/gif": {
    source: "iana",
    extensions: ["gif"]
  },
  "image/heic": {
    source: "iana",
    extensions: ["heic"]
  },
  "image/heic-sequence": {
    source: "iana",
    extensions: ["heics"]
  },
  "image/heif": {
    source: "iana",
    extensions: ["heif"]
  },
  "image/heif-sequence": {
    source: "iana",
    extensions: ["heifs"]
  },
  "image/hej2k": {
    source: "iana",
    extensions: ["hej2"]
  },
  "image/hsj2": {
    source: "iana",
    extensions: ["hsj2"]
  },
  "image/ief": {
    source: "iana",
    extensions: ["ief"]
  },
  "image/jls": {
    source: "iana",
    extensions: ["jls"]
  },
  "image/jp2": {
    source: "iana",
    extensions: ["jp2", "jpg2"]
  },
  "image/jpeg": {
    source: "iana",
    extensions: [
      "jpeg",
      "jpg",
      "jpe",
      "jfif",
      "pjpeg",
      "pjp"
    ]
  },
  "image/jph": {
    source: "iana",
    extensions: ["jph"]
  },
  "image/jphc": {
    source: "iana",
    extensions: ["jhc"]
  },
  "image/jpm": {
    source: "iana",
    extensions: ["jpm"]
  },
  "image/jpx": {
    source: "iana",
    extensions: ["jpx", "jpf"]
  },
  "image/jxr": {
    source: "iana",
    extensions: ["jxr"]
  },
  "image/jxra": {
    source: "iana",
    extensions: ["jxra"]
  },
  "image/jxrs": {
    source: "iana",
    extensions: ["jxrs"]
  },
  "image/jxs": {
    source: "iana",
    extensions: ["jxs"]
  },
  "image/jxsc": {
    source: "iana",
    extensions: ["jxsc"]
  },
  "image/jxsi": {
    source: "iana",
    extensions: ["jxsi"]
  },
  "image/jxss": {
    source: "iana",
    extensions: ["jxss"]
  },
  "image/ktx": {
    source: "iana",
    extensions: ["ktx"]
  },
  "image/ktx2": {
    source: "iana",
    extensions: ["ktx2"]
  },
  "image/png": {
    source: "iana",
    extensions: ["png"]
  },
  "image/prs.btif": {
    source: "iana",
    extensions: ["btif"]
  },
  "image/prs.pti": {
    source: "iana",
    extensions: ["pti"]
  },
  "image/sgi": {
    source: "apache",
    extensions: ["sgi"]
  },
  "image/svg+xml": {
    source: "iana",
    extensions: ["svg", "svgz"]
  },
  "image/t38": {
    source: "iana",
    extensions: ["t38"]
  },
  "image/tiff": {
    source: "iana",
    extensions: ["tif", "tiff"]
  },
  "image/tiff-fx": {
    source: "iana",
    extensions: ["tfx"]
  },
  "image/vnd.adobe.photoshop": {
    source: "iana",
    extensions: ["psd"]
  },
  "image/vnd.airzip.accelerator.azv": {
    source: "iana",
    extensions: ["azv"]
  },
  "image/vnd.dece.graphic": {
    source: "iana",
    extensions: [
      "uvi",
      "uvvi",
      "uvg",
      "uvvg"
    ]
  },
  "image/vnd.djvu": {
    source: "iana",
    extensions: ["djvu", "djv"]
  },
  "image/vnd.dvb.subtitle": {
    source: "iana",
    extensions: ["sub"]
  },
  "image/vnd.dwg": {
    source: "iana",
    extensions: ["dwg"]
  },
  "image/vnd.dxf": {
    source: "iana",
    extensions: ["dxf"]
  },
  "image/vnd.fastbidsheet": {
    source: "iana",
    extensions: ["fbs"]
  },
  "image/vnd.fpx": {
    source: "iana",
    extensions: ["fpx"]
  },
  "image/vnd.fst": {
    source: "iana",
    extensions: ["fst"]
  },
  "image/vnd.fujixerox.edmics-mmr": {
    source: "iana",
    extensions: ["mmr"]
  },
  "image/vnd.fujixerox.edmics-rlc": {
    source: "iana",
    extensions: ["rlc"]
  },
  "image/vnd.microsoft.icon": {
    source: "iana",
    extensions: ["ico"]
  },
  "image/vnd.ms-modi": {
    source: "iana",
    extensions: ["mdi"]
  },
  "image/vnd.ms-photo": {
    source: "apache",
    extensions: ["wdp"]
  },
  "image/vnd.net-fpx": {
    source: "iana",
    extensions: ["npx"]
  },
  "image/vnd.pco.b16": {
    source: "iana",
    extensions: ["b16"]
  },
  "image/vnd.tencent.tap": {
    source: "iana",
    extensions: ["tap"]
  },
  "image/vnd.valve.source.texture": {
    source: "iana",
    extensions: ["vtf"]
  },
  "image/vnd.wap.wbmp": {
    source: "iana",
    extensions: ["wbmp"]
  },
  "image/vnd.xiff": {
    source: "iana",
    extensions: ["xif"]
  },
  "image/vnd.zbrush.pcx": {
    source: "iana",
    extensions: ["pcx"]
  },
  "image/webp": {
    source: "apache",
    extensions: ["webp"]
  },
  "image/wmf": {
    source: "iana",
    extensions: ["wmf"]
  },
  "image/x-3ds": {
    source: "apache",
    extensions: ["3ds"]
  },
  "image/x-cmu-raster": {
    source: "apache",
    extensions: ["ras"]
  },
  "image/x-cmx": {
    source: "apache",
    extensions: ["cmx"]
  },
  "image/x-freehand": {
    source: "apache",
    extensions: [
      "fh",
      "fhc",
      "fh4",
      "fh5",
      "fh7"
    ]
  },
  "image/x-icon": {
    source: "apache",
    extensions: ["ico"]
  },
  "image/x-jng": {
    source: "nginx",
    extensions: ["jng"]
  },
  "image/x-mrsid-image": {
    source: "apache",
    extensions: ["sid"]
  },
  "image/x-ms-bmp": {
    source: "nginx",
    extensions: ["bmp"]
  },
  "image/x-pcx": {
    source: "apache",
    extensions: ["pcx"]
  },
  "image/x-pict": {
    source: "apache",
    extensions: ["pic", "pct"]
  },
  "image/x-portable-anymap": {
    source: "apache",
    extensions: ["pnm"]
  },
  "image/x-portable-bitmap": {
    source: "apache",
    extensions: ["pbm"]
  },
  "image/x-portable-graymap": {
    source: "apache",
    extensions: ["pgm"]
  },
  "image/x-portable-pixmap": {
    source: "apache",
    extensions: ["ppm"]
  },
  "image/x-rgb": {
    source: "apache",
    extensions: ["rgb"]
  },
  "image/x-tga": {
    source: "apache",
    extensions: ["tga"]
  },
  "image/x-xbitmap": {
    source: "apache",
    extensions: ["xbm"]
  },
  "image/x-xpixmap": {
    source: "apache",
    extensions: ["xpm"]
  },
  "image/x-xwindowdump": {
    source: "apache",
    extensions: ["xwd"]
  }
};

// node_modules/@uploadthing/mime-types/dist/text-rT5siJci.js
var text = {
  "text/cache-manifest": {
    source: "iana",
    extensions: ["appcache", "manifest"]
  },
  "text/calendar": {
    source: "iana",
    extensions: ["ics", "ifb"]
  },
  "text/css": {
    source: "iana",
    charset: "UTF-8",
    extensions: ["css"]
  },
  "text/csv": {
    source: "iana",
    extensions: ["csv"]
  },
  "text/html": {
    source: "iana",
    extensions: [
      "html",
      "htm",
      "shtml"
    ]
  },
  "text/markdown": {
    source: "iana",
    extensions: ["markdown", "md"]
  },
  "text/mathml": {
    source: "nginx",
    extensions: ["mml"]
  },
  "text/n3": {
    source: "iana",
    charset: "UTF-8",
    extensions: ["n3"]
  },
  "text/plain": {
    source: "iana",
    extensions: [
      "txt",
      "text",
      "conf",
      "def",
      "list",
      "log",
      "in",
      "ini"
    ]
  },
  "text/prs.lines.tag": {
    source: "iana",
    extensions: ["dsc"]
  },
  "text/richtext": {
    source: "iana",
    extensions: ["rtx"]
  },
  "text/rtf": {
    source: "iana",
    extensions: ["rtf"]
  },
  "text/sgml": {
    source: "iana",
    extensions: ["sgml", "sgm"]
  },
  "text/shex": {
    source: "iana",
    extensions: ["shex"]
  },
  "text/spdx": {
    source: "iana",
    extensions: ["spdx"]
  },
  "text/tab-separated-values": {
    source: "iana",
    extensions: ["tsv"]
  },
  "text/troff": {
    source: "iana",
    extensions: [
      "t",
      "tr",
      "roff",
      "man",
      "me",
      "ms"
    ]
  },
  "text/turtle": {
    source: "iana",
    charset: "UTF-8",
    extensions: ["ttl"]
  },
  "text/uri-list": {
    source: "iana",
    extensions: [
      "uri",
      "uris",
      "urls"
    ]
  },
  "text/vcard": {
    source: "iana",
    extensions: ["vcard"]
  },
  "text/vnd.curl": {
    source: "iana",
    extensions: ["curl"]
  },
  "text/vnd.curl.dcurl": {
    source: "apache",
    extensions: ["dcurl"]
  },
  "text/vnd.curl.mcurl": {
    source: "apache",
    extensions: ["mcurl"]
  },
  "text/vnd.curl.scurl": {
    source: "apache",
    extensions: ["scurl"]
  },
  "text/vnd.dvb.subtitle": {
    source: "iana",
    extensions: ["sub"]
  },
  "text/vnd.familysearch.gedcom": {
    source: "iana",
    extensions: ["ged"]
  },
  "text/vnd.fly": {
    source: "iana",
    extensions: ["fly"]
  },
  "text/vnd.fmi.flexstor": {
    source: "iana",
    extensions: ["flx"]
  },
  "text/vnd.graphviz": {
    source: "iana",
    extensions: ["gv"]
  },
  "text/vnd.in3d.3dml": {
    source: "iana",
    extensions: ["3dml"]
  },
  "text/vnd.in3d.spot": {
    source: "iana",
    extensions: ["spot"]
  },
  "text/vnd.sun.j2me.app-descriptor": {
    source: "iana",
    charset: "UTF-8",
    extensions: ["jad"]
  },
  "text/vnd.wap.wml": {
    source: "iana",
    extensions: ["wml"]
  },
  "text/vnd.wap.wmlscript": {
    source: "iana",
    extensions: ["wmls"]
  },
  "text/vtt": {
    source: "iana",
    charset: "UTF-8",
    extensions: ["vtt"]
  },
  "text/x-asm": {
    source: "apache",
    extensions: ["s", "asm"]
  },
  "text/x-c": {
    source: "apache",
    extensions: [
      "c",
      "cc",
      "cxx",
      "cpp",
      "h",
      "hh",
      "dic"
    ]
  },
  "text/x-component": {
    source: "nginx",
    extensions: ["htc"]
  },
  "text/x-fortran": {
    source: "apache",
    extensions: [
      "f",
      "for",
      "f77",
      "f90"
    ]
  },
  "text/x-java-source": {
    source: "apache",
    extensions: ["java"]
  },
  "text/x-nfo": {
    source: "apache",
    extensions: ["nfo"]
  },
  "text/x-opml": {
    source: "apache",
    extensions: ["opml"]
  },
  "text/x-pascal": {
    source: "apache",
    extensions: ["p", "pas"]
  },
  "text/x-setext": {
    source: "apache",
    extensions: ["etx"]
  },
  "text/x-sfv": {
    source: "apache",
    extensions: ["sfv"]
  },
  "text/x-uuencode": {
    source: "apache",
    extensions: ["uu"]
  },
  "text/x-vcalendar": {
    source: "apache",
    extensions: ["vcs"]
  },
  "text/x-vcard": {
    source: "apache",
    extensions: ["vcf"]
  },
  "text/xml": {
    source: "iana",
    extensions: ["xml"]
  }
};

// node_modules/@uploadthing/mime-types/dist/video-CGl9M1pn.js
var video = {
  "video/3gpp": {
    source: "iana",
    extensions: ["3gp", "3gpp"]
  },
  "video/3gpp2": {
    source: "iana",
    extensions: ["3g2"]
  },
  "video/h261": {
    source: "iana",
    extensions: ["h261"]
  },
  "video/h263": {
    source: "iana",
    extensions: ["h263"]
  },
  "video/h264": {
    source: "iana",
    extensions: ["h264"]
  },
  "video/iso.segment": {
    source: "iana",
    extensions: ["m4s"]
  },
  "video/jpeg": {
    source: "iana",
    extensions: ["jpgv"]
  },
  "video/jpm": {
    source: "apache",
    extensions: ["jpm", "jpgm"]
  },
  "video/mj2": {
    source: "iana",
    extensions: ["mj2", "mjp2"]
  },
  "video/mp2t": {
    source: "iana",
    extensions: ["ts"]
  },
  "video/mp4": {
    source: "iana",
    extensions: [
      "mp4",
      "mp4v",
      "mpg4"
    ]
  },
  "video/mpeg": {
    source: "iana",
    extensions: [
      "mpeg",
      "mpg",
      "mpe",
      "m1v",
      "m2v"
    ]
  },
  "video/ogg": {
    source: "iana",
    extensions: ["ogv"]
  },
  "video/quicktime": {
    source: "iana",
    extensions: ["qt", "mov"]
  },
  "video/vnd.dece.hd": {
    source: "iana",
    extensions: ["uvh", "uvvh"]
  },
  "video/vnd.dece.mobile": {
    source: "iana",
    extensions: ["uvm", "uvvm"]
  },
  "video/vnd.dece.pd": {
    source: "iana",
    extensions: ["uvp", "uvvp"]
  },
  "video/vnd.dece.sd": {
    source: "iana",
    extensions: ["uvs", "uvvs"]
  },
  "video/vnd.dece.video": {
    source: "iana",
    extensions: ["uvv", "uvvv"]
  },
  "video/vnd.dvb.file": {
    source: "iana",
    extensions: ["dvb"]
  },
  "video/vnd.fvt": {
    source: "iana",
    extensions: ["fvt"]
  },
  "video/vnd.mpegurl": {
    source: "iana",
    extensions: ["mxu", "m4u"]
  },
  "video/vnd.ms-playready.media.pyv": {
    source: "iana",
    extensions: ["pyv"]
  },
  "video/vnd.uvvu.mp4": {
    source: "iana",
    extensions: ["uvu", "uvvu"]
  },
  "video/vnd.vivo": {
    source: "iana",
    extensions: ["viv"]
  },
  "video/webm": {
    source: "apache",
    extensions: ["webm"]
  },
  "video/x-f4v": {
    source: "apache",
    extensions: ["f4v"]
  },
  "video/x-fli": {
    source: "apache",
    extensions: ["fli"]
  },
  "video/x-flv": {
    source: "apache",
    extensions: ["flv"]
  },
  "video/x-m4v": {
    source: "apache",
    extensions: ["m4v"]
  },
  "video/x-matroska": {
    source: "apache",
    extensions: [
      "mkv",
      "mk3d",
      "mks"
    ]
  },
  "video/x-mng": {
    source: "apache",
    extensions: ["mng"]
  },
  "video/x-ms-asf": {
    source: "apache",
    extensions: ["asf", "asx"]
  },
  "video/x-ms-vob": {
    source: "apache",
    extensions: ["vob"]
  },
  "video/x-ms-wm": {
    source: "apache",
    extensions: ["wm"]
  },
  "video/x-ms-wmv": {
    source: "apache",
    extensions: ["wmv"]
  },
  "video/x-ms-wmx": {
    source: "apache",
    extensions: ["wmx"]
  },
  "video/x-ms-wvx": {
    source: "apache",
    extensions: ["wvx"]
  },
  "video/x-msvideo": {
    source: "apache",
    extensions: ["avi"]
  },
  "video/x-sgi-movie": {
    source: "apache",
    extensions: ["movie"]
  },
  "video/x-smv": {
    source: "apache",
    extensions: ["smv"]
  }
};

// node_modules/@uploadthing/mime-types/dist/index.js
var misc = {
  "chemical/x-cdx": {
    source: "apache",
    extensions: ["cdx"]
  },
  "chemical/x-cif": {
    source: "apache",
    extensions: ["cif"]
  },
  "chemical/x-cmdf": {
    source: "apache",
    extensions: ["cmdf"]
  },
  "chemical/x-cml": {
    source: "apache",
    extensions: ["cml"]
  },
  "chemical/x-csml": {
    source: "apache",
    extensions: ["csml"]
  },
  "chemical/x-xyz": {
    source: "apache",
    extensions: ["xyz"]
  },
  "font/collection": {
    source: "iana",
    extensions: ["ttc"]
  },
  "font/otf": {
    source: "iana",
    extensions: ["otf"]
  },
  "font/ttf": {
    source: "iana",
    extensions: ["ttf"]
  },
  "font/woff": {
    source: "iana",
    extensions: ["woff"]
  },
  "font/woff2": {
    source: "iana",
    extensions: ["woff2"]
  },
  "message/disposition-notification": {
    source: "iana",
    extensions: ["disposition-notification"]
  },
  "message/global": {
    source: "iana",
    extensions: ["u8msg"]
  },
  "message/global-delivery-status": {
    source: "iana",
    extensions: ["u8dsn"]
  },
  "message/global-disposition-notification": {
    source: "iana",
    extensions: ["u8mdn"]
  },
  "message/global-headers": {
    source: "iana",
    extensions: ["u8hdr"]
  },
  "message/rfc822": {
    source: "iana",
    extensions: ["eml", "mime"]
  },
  "message/vnd.wfa.wsc": {
    source: "iana",
    extensions: ["wsc"]
  },
  "model/3mf": {
    source: "iana",
    extensions: ["3mf"]
  },
  "model/gltf+json": {
    source: "iana",
    extensions: ["gltf"]
  },
  "model/gltf-binary": {
    source: "iana",
    extensions: ["glb"]
  },
  "model/iges": {
    source: "iana",
    extensions: ["igs", "iges"]
  },
  "model/mesh": {
    source: "iana",
    extensions: [
      "msh",
      "mesh",
      "silo"
    ]
  },
  "model/mtl": {
    source: "iana",
    extensions: ["mtl"]
  },
  "model/obj": {
    source: "iana",
    extensions: ["obj"]
  },
  "model/step": {
    source: "iana",
    extensions: [
      ".p21",
      ".stp",
      ".step",
      ".stpnc",
      ".210"
    ]
  },
  "model/step+xml": {
    source: "iana",
    extensions: ["stpx"]
  },
  "model/step+zip": {
    source: "iana",
    extensions: ["stpz"]
  },
  "model/step-xml+zip": {
    source: "iana",
    extensions: ["stpxz"]
  },
  "model/stl": {
    source: "iana",
    extensions: ["stl"]
  },
  "model/vnd.collada+xml": {
    source: "iana",
    extensions: ["dae"]
  },
  "model/vnd.dwf": {
    source: "iana",
    extensions: ["dwf"]
  },
  "model/vnd.gdl": {
    source: "iana",
    extensions: ["gdl"]
  },
  "model/vnd.gtw": {
    source: "iana",
    extensions: ["gtw"]
  },
  "model/vnd.mts": {
    source: "iana",
    extensions: ["mts"]
  },
  "model/vnd.opengex": {
    source: "iana",
    extensions: ["ogex"]
  },
  "model/vnd.parasolid.transmit.binary": {
    source: "iana",
    extensions: ["x_b"]
  },
  "model/vnd.parasolid.transmit.text": {
    source: "iana",
    extensions: ["x_t"]
  },
  "model/vnd.sap.vds": {
    source: "iana",
    extensions: ["vds"]
  },
  "model/vnd.usdz+zip": {
    source: "iana",
    extensions: ["usdz"]
  },
  "model/vnd.valve.source.compiled-map": {
    source: "iana",
    extensions: ["bsp"]
  },
  "model/vnd.vtu": {
    source: "iana",
    extensions: ["vtu"]
  },
  "model/vrml": {
    source: "iana",
    extensions: ["wrl", "vrml"]
  },
  "model/x3d+binary": {
    source: "apache",
    extensions: ["x3db", "x3dbz"]
  },
  "model/x3d+fastinfoset": {
    source: "iana",
    extensions: ["x3db"]
  },
  "model/x3d+vrml": {
    source: "apache",
    extensions: ["x3dv", "x3dvz"]
  },
  "model/x3d+xml": {
    source: "iana",
    extensions: ["x3d", "x3dz"]
  },
  "model/x3d-vrml": {
    source: "iana",
    extensions: ["x3dv"]
  },
  "x-conference/x-cooltalk": {
    source: "apache",
    extensions: ["ice"]
  }
};
var mimes = {
  ...application,
  ...audio,
  ...image,
  ...text,
  ...video,
  ...misc
};
var mimeTypes = mimes;
function extname(path) {
  const index = path.lastIndexOf(".");
  return index < 0 ? "" : path.substring(index);
}
var extensions = {};
var types = {};
function getTypes() {
  populateMaps(extensions, types);
  return types;
}
function lookup(path) {
  if (!path || typeof path !== "string") return false;
  const extension = extname("x." + path).toLowerCase().substring(1);
  if (!extension) return false;
  return getTypes()[extension] || false;
}
var inittedMaps = false;
function populateMaps(extensions$1, types$1) {
  if (inittedMaps) return;
  inittedMaps = true;
  const preference = [
    "nginx",
    "apache",
    void 0,
    "iana"
  ];
  Object.keys(mimeTypes).forEach((type) => {
    const mime = mimeTypes[type];
    const exts = mime.extensions;
    if (!exts.length) return;
    extensions$1[type] = exts;
    for (const extension of exts) {
      if (extension in types$1) {
        const from = preference.indexOf(mimeTypes[types$1[extension]].source);
        const to = preference.indexOf(mime.source);
        if (types$1[extension] !== "application/octet-stream" && (from > to || from === to && types$1[extension].startsWith("application/"))) continue;
      }
      types$1[extension] = type;
    }
  });
}

// node_modules/@uploadthing/shared/dist/index.js
var InvalidRouteConfigError = class extends TaggedError("InvalidRouteConfig") {
  constructor(type, field) {
    const reason = field ? `Expected route config to have a ${field} for key ${type} but none was found.` : `Encountered an invalid route config during backfilling. ${type} was not found.`;
    super({ reason });
  }
};
var UnknownFileTypeError = class extends TaggedError("UnknownFileType") {
  constructor(fileName) {
    const reason = `Could not determine type for ${fileName}`;
    super({ reason });
  }
};
var InvalidFileTypeError = class extends TaggedError("InvalidFileType") {
  constructor(fileType, fileName) {
    const reason = `File type ${fileType} not allowed for ${fileName}`;
    super({ reason });
  }
};
var InvalidFileSizeError = class extends TaggedError("InvalidFileSize") {
  constructor(fileSize) {
    const reason = `Invalid file size: ${fileSize}`;
    super({ reason });
  }
};
var InvalidURLError = class extends TaggedError("InvalidURL") {
  constructor(attemptedUrl) {
    super({ reason: `Failed to parse '${attemptedUrl}' as a URL.` });
  }
};
var RetryError = class extends TaggedError("RetryError") {
};
var FetchError = class extends TaggedError("FetchError") {
};
var InvalidJsonError = class extends TaggedError("InvalidJson") {
};
var BadRequestError = class extends TaggedError("BadRequestError") {
  getMessage() {
    if (isRecord(this.json)) {
      if (typeof this.json.message === "string") return this.json.message;
    }
    return this.message;
  }
};
var UploadPausedError = class extends TaggedError("UploadAborted") {
};
var UploadAbortedError = class extends TaggedError("UploadAborted") {
};
var matchFileType = (file, allowedTypes) => {
  const mimeType = file.type || lookup(file.name);
  if (!mimeType) {
    if (allowedTypes.includes("blob")) return succeed("blob");
    return fail(new UnknownFileTypeError(file.name));
  }
  if (allowedTypes.some((type$1) => type$1.includes("/"))) {
    if (allowedTypes.includes(mimeType)) return succeed(mimeType);
  }
  const type = mimeType.toLowerCase() === "application/pdf" ? "pdf" : mimeType.split("/")[0];
  if (!allowedTypes.includes(type)) if (allowedTypes.includes("blob")) return succeed("blob");
  else return fail(new InvalidFileTypeError(type, file.name));
  return succeed(type);
};
var FILESIZE_UNITS = [
  "B",
  "KB",
  "MB",
  "GB",
  "TB"
];
var fileSizeToBytes = (fileSize) => {
  const regex = new RegExp(`^(\\d+)(\\.\\d+)?\\s*(${FILESIZE_UNITS.join("|")})$`, "i");
  const match = fileSize.match(regex);
  if (!match?.[1] || !match[3]) return fail(new InvalidFileSizeError(fileSize));
  const sizeValue = parseFloat(match[1]);
  const sizeUnit = match[3].toUpperCase();
  const bytes = sizeValue * Math.pow(1024, FILESIZE_UNITS.indexOf(sizeUnit));
  return succeed(Math.floor(bytes));
};
var bytesToFileSize = (bytes) => {
  if (bytes === 0 || bytes === -1) return "0B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)}${FILESIZE_UNITS[i]}`;
};
function objectKeys(obj) {
  return Object.keys(obj);
}
var getFullApiUrl = (maybeUrl) => gen(function* () {
  const base = (() => {
    if (typeof window !== "undefined") return window.location.origin;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return "http://localhost:3000";
  })();
  const url = yield* try_({
    try: () => new URL(maybeUrl ?? "/api/uploadthing", base),
    catch: () => new InvalidURLError(maybeUrl ?? "/api/uploadthing")
  });
  if (url.pathname === "/") url.pathname = "/api/uploadthing";
  return url;
});
var resolveMaybeUrlArg = (maybeUrl) => {
  return maybeUrl instanceof URL ? maybeUrl : runSync(getFullApiUrl(maybeUrl));
};
function noop() {
}
function createIdentityProxy() {
  return new Proxy(noop, { get: (_, prop) => prop });
}
var ERROR_CODES = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  INTERNAL_SERVER_ERROR: 500,
  INTERNAL_CLIENT_ERROR: 500,
  TOO_LARGE: 413,
  TOO_SMALL: 400,
  TOO_MANY_FILES: 400,
  KEY_TOO_LONG: 400,
  URL_GENERATION_FAILED: 500,
  UPLOAD_FAILED: 500,
  MISSING_ENV: 500,
  INVALID_SERVER_CONFIG: 500,
  FILE_LIMIT_EXCEEDED: 500
};
function messageFromUnknown(cause, fallback) {
  if (typeof cause === "string") return cause;
  if (cause instanceof Error) return cause.message;
  if (cause && typeof cause === "object" && "message" in cause && typeof cause.message === "string") return cause.message;
  return fallback ?? "An unknown error occurred";
}
var UploadThingError = class UploadThingError2 extends Error2 {
  _tag = "UploadThingError";
  name = "UploadThingError";
  cause;
  code;
  data;
  constructor(initOpts) {
    const opts = typeof initOpts === "string" ? {
      code: "INTERNAL_SERVER_ERROR",
      message: initOpts
    } : initOpts;
    const message = opts.message ?? messageFromUnknown(opts.cause, opts.code);
    super({ message });
    this.code = opts.code;
    this.data = opts.data;
    if (opts.cause instanceof Error) this.cause = opts.cause;
    else if (isRecord(opts.cause) && isNumber(opts.cause.status) && isString(opts.cause.statusText)) this.cause = /* @__PURE__ */ new Error(`Response ${opts.cause.status} ${opts.cause.statusText}`);
    else if (isString(opts.cause)) this.cause = new Error(opts.cause);
    else this.cause = opts.cause;
  }
  static toObject(error) {
    return {
      code: error.code,
      message: error.message,
      data: error.data
    };
  }
  static serialize(error) {
    return JSON.stringify(UploadThingError2.toObject(error));
  }
};
function getErrorTypeFromStatusCode(statusCode) {
  for (const [code, status] of Object.entries(ERROR_CODES)) if (status === statusCode) return code;
  return "INTERNAL_SERVER_ERROR";
}
var FetchContext = class extends Tag2("uploadthing/Fetch")() {
};
var fetchEff = (input, init) => flatMap(service(FetchContext), (fetch) => {
  const headers = new Headers(init?.headers ?? []);
  const reqInfo = {
    url: input.toString(),
    method: init?.method,
    body: init?.body,
    headers: Object.fromEntries(headers)
  };
  return tryPromise({
    try: (signal) => fetch(input, {
      ...init,
      headers,
      signal
    }),
    catch: (error) => new FetchError({
      error: error instanceof Error ? {
        ...error,
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      input: reqInfo
    })
  }).pipe(tapError((e) => sync(() => console.error(e.input))), map((res) => Object.assign(res, { requestUrl: reqInfo.url })), withTrace("fetch"));
});
var parseResponseJson = (res) => tryPromise({
  try: async () => {
    const json = await res.json();
    return {
      json,
      ok: res.ok,
      status: res.status
    };
  },
  catch: (error) => new InvalidJsonError({
    error,
    input: res.requestUrl
  })
}).pipe(filterOrFail(({ ok }) => ok, ({ json, status }) => new BadRequestError({
  status,
  message: `Request to ${res.requestUrl} failed with status ${status}`,
  json
})), map(({ json }) => json), withTrace("parseJson"));
var generateMimeTypes = (typesOrRouteConfig) => {
  const fileTypes = Array.isArray(typesOrRouteConfig) ? typesOrRouteConfig : objectKeys(typesOrRouteConfig);
  if (fileTypes.includes("blob")) return [];
  return fileTypes.map((type) => {
    if (type === "pdf") return "application/pdf";
    if (type.includes("/")) return type;
    if (type === "audio") return ["audio/*", ...objectKeys(audio)].join(", ");
    if (type === "image") return ["image/*", ...objectKeys(image)].join(", ");
    if (type === "text") return ["text/*", ...objectKeys(text)].join(", ");
    if (type === "video") return ["video/*", ...objectKeys(video)].join(", ");
    return `${type}/*`;
  });
};
var generateClientDropzoneAccept = (fileTypes) => {
  const mimeTypes2 = generateMimeTypes(fileTypes);
  return Object.fromEntries(mimeTypes2.map((type) => [type, []]));
};
var generatePermittedFileTypes = (config) => {
  const fileTypes = config ? objectKeys(config) : [];
  const maxFileCount = config ? Object.values(config).map((v) => v.maxFileCount) : [];
  return {
    fileTypes,
    multiple: maxFileCount.some((v) => v && v > 1)
  };
};
var capitalizeStart = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
var INTERNAL_doFormatting = (config) => {
  if (!config) return "";
  const allowedTypes = objectKeys(config);
  const formattedTypes = allowedTypes.map((f) => f === "blob" ? "file" : f);
  if (formattedTypes.length > 1) {
    const lastType = formattedTypes.pop();
    return `${formattedTypes.join("s, ")} and ${lastType}s`;
  }
  const key = allowedTypes[0];
  const formattedKey = formattedTypes[0];
  if (!key || !formattedKey) return "";
  const { maxFileSize, maxFileCount, minFileCount } = config[key];
  if (maxFileCount && maxFileCount > 1) if (minFileCount > 1) return `${minFileCount} - ${maxFileCount} ${formattedKey}s up to ${maxFileSize}`;
  else return `${formattedKey}s up to ${maxFileSize}, max ${maxFileCount}`;
  else return `${formattedKey} (${maxFileSize})`;
};
var allowedContentTextLabelGenerator = (config) => {
  return capitalizeStart(INTERNAL_doFormatting(config));
};
var encoder = new TextEncoder();

// node_modules/uploadthing/dist/ut-reporter-Dlppchbx.js
var createDeferred = () => {
  let resolve;
  let reject;
  const ac = new AbortController();
  const promise2 = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {
    promise: promise2,
    ac,
    resolve,
    reject
  };
};
var randomHexString = /* @__PURE__ */ (function() {
  const characters = "abcdef0123456789";
  const charactersLength = 16;
  return function(length) {
    let result = "";
    for (let i = 0; i < length; i++) result += characters.charAt(Math.floor(Math.random() * charactersLength));
    return result;
  };
})();
var generateTraceHeaders = () => {
  const traceId = randomHexString(32);
  const spanId = randomHexString(16);
  const sampled = "01";
  return {
    b3: `${traceId}-${spanId}-${sampled}`,
    traceparent: `00-${traceId}-${spanId}-${sampled}`
  };
};
var createAPIRequestUrl = (config) => {
  const url = new URL(config.url);
  const queryParams = new URLSearchParams(url.search);
  queryParams.set("actionType", config.actionType);
  queryParams.set("slug", config.slug);
  url.search = queryParams.toString();
  return url;
};
var createUTReporter = (cfg) => (type, payload) => gen(function* () {
  const url = createAPIRequestUrl({
    url: cfg.url,
    slug: cfg.endpoint,
    actionType: type
  });
  const headers = new Headers(yield* promise(async () => typeof cfg.headers === "function" ? await cfg.headers() : cfg.headers));
  if (cfg.package) headers.set("x-uploadthing-package", cfg.package);
  headers.set("x-uploadthing-version", version);
  headers.set("Content-Type", "application/json");
  headers.set("b3", cfg.traceHeaders.b3);
  headers.set("traceparent", cfg.traceHeaders.traceparent);
  const response = yield* fetchEff(url, {
    method: "POST",
    body: JSON.stringify(payload),
    headers
  }).pipe(
    andThen(parseResponseJson),
    /**
    * We don't _need_ to validate the response here, just cast it for now.
    * As of now, @effect/schema includes quite a few bytes we cut out by this...
    * We have "strong typing" on the backend that ensures the shape should match.
    */
    map(unsafeCoerce),
    catchTag("FetchError", (e) => fail(new UploadThingError({
      code: "INTERNAL_CLIENT_ERROR",
      message: `Failed to report event "${type}" to UploadThing server`,
      cause: e
    }))),
    catchTag("BadRequestError", (e) => fail(new UploadThingError({
      code: getErrorTypeFromStatusCode(e.status),
      message: e.getMessage(),
      cause: e.json
    }))),
    catchTag("InvalidJson", (e) => fail(new UploadThingError({
      code: "INTERNAL_CLIENT_ERROR",
      message: "Failed to parse response from UploadThing server",
      cause: e
    })))
  );
  return response;
});

// node_modules/uploadthing/dist/deprecations-pLmw6Ytd.js
var logDeprecationWarning = (message) => {
  console.warn(`\u26A0\uFE0F [uploadthing][deprecated] ${message}`);
};

// node_modules/uploadthing/client/index.js
var uploadWithProgress = (file, rangeStart, presigned, opts) => async((resume) => {
  const xhr = new XMLHttpRequest();
  xhr.open("PUT", presigned.url, true);
  xhr.setRequestHeader("Range", `bytes=${rangeStart}-`);
  xhr.setRequestHeader("x-uploadthing-version", version);
  xhr.setRequestHeader("b3", opts.traceHeaders.b3);
  xhr.setRequestHeader("traceparent", opts.traceHeaders.traceparent);
  xhr.responseType = "json";
  let previousLoaded = 0;
  xhr.upload.addEventListener("progress", ({ loaded }) => {
    const delta = loaded - previousLoaded;
    opts.onUploadProgress?.({
      loaded,
      delta
    });
    previousLoaded = loaded;
  });
  xhr.addEventListener("load", () => {
    if (xhr.status >= 200 && xhr.status < 300 && isRecord(xhr.response)) if (hasProperty(xhr.response, "error")) resume(new UploadThingError({
      code: "UPLOAD_FAILED",
      message: String(xhr.response.error),
      data: xhr.response
    }));
    else resume(succeed(xhr.response));
    else resume(new UploadThingError({
      code: "UPLOAD_FAILED",
      message: `XHR failed ${xhr.status} ${xhr.statusText}`,
      data: xhr.response
    }));
  });
  xhr.addEventListener("error", () => {
    resume(new UploadThingError({ code: "UPLOAD_FAILED" }));
  });
  const formData = new FormData();
  if ("uri" in file) formData.append("file", {
    uri: file.uri,
    type: file.type,
    name: file.name,
    ...rangeStart > 0 && { range: rangeStart }
  });
  else formData.append("file", rangeStart > 0 ? file.slice(rangeStart) : file);
  xhr.send(formData);
  return sync(() => xhr.abort());
});
var uploadFile = (file, presigned, opts) => fetchEff(presigned.url, {
  method: "HEAD",
  headers: opts.traceHeaders
}).pipe(map(({ headers }) => parseInt(headers.get("x-ut-range-start") ?? "0", 10)), tap((start) => opts.onUploadProgress?.({
  delta: start,
  loaded: start
})), flatMap((start) => uploadWithProgress(file, start, presigned, {
  traceHeaders: opts.traceHeaders,
  onUploadProgress: (progressEvent) => opts.onUploadProgress?.({
    delta: progressEvent.delta,
    loaded: progressEvent.loaded + start
  })
})), map(unsafeCoerce), map((uploadResponse) => ({
  name: file.name,
  size: file.size,
  key: presigned.key,
  lastModified: file.lastModified,
  serverData: uploadResponse.serverData,
  get url() {
    logDeprecationWarning("`file.url` is deprecated and will be removed in uploadthing v9. Use `file.ufsUrl` instead.");
    return uploadResponse.url;
  },
  get appUrl() {
    logDeprecationWarning("`file.appUrl` is deprecated and will be removed in uploadthing v9. Use `file.ufsUrl` instead.");
    return uploadResponse.appUrl;
  },
  ufsUrl: uploadResponse.ufsUrl,
  customId: presigned.customId,
  type: file.type,
  fileHash: uploadResponse.fileHash
})));
var uploadFilesInternal = (endpoint, opts) => {
  const traceHeaders = generateTraceHeaders();
  const reportEventToUT = createUTReporter({
    endpoint: String(endpoint),
    package: opts.package,
    url: opts.url,
    headers: opts.headers,
    traceHeaders
  });
  const totalSize = opts.files.reduce((acc, f) => acc + f.size, 0);
  let totalLoaded = 0;
  return flatMap(reportEventToUT("upload", {
    input: "input" in opts ? opts.input : null,
    files: opts.files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      lastModified: f.lastModified
    }))
  }), (presigneds) => forEach(presigneds, (presigned, i) => flatMap(sync(() => opts.onUploadBegin?.({ file: opts.files[i].name })), () => uploadFile(opts.files[i], presigned, {
    traceHeaders,
    onUploadProgress: (ev) => {
      totalLoaded += ev.delta;
      opts.onUploadProgress?.({
        file: opts.files[i],
        progress: ev.loaded / opts.files[i].size * 100,
        loaded: ev.loaded,
        delta: ev.delta,
        totalLoaded,
        totalProgress: totalLoaded / totalSize
      });
    }
  })), { concurrency: 6 }));
};
var version$1 = version;
var isValidFileType = (file, routeConfig) => runSync(matchFileType(file, objectKeys(routeConfig)).pipe(map((type) => file.type.includes(type)), orElseSucceed(() => false)));
var isValidFileSize = (file, routeConfig) => runSync(matchFileType(file, objectKeys(routeConfig)).pipe(flatMap((type) => fileSizeToBytes(routeConfig[type].maxFileSize)), map((maxFileSize) => file.size <= maxFileSize), orElseSucceed(() => false)));
var genUploader = (initOpts) => {
  const routeRegistry = createIdentityProxy();
  const controllableUpload = async (slug, opts) => {
    const uploads = /* @__PURE__ */ new Map();
    const endpoint = typeof slug === "function" ? slug(routeRegistry) : slug;
    const traceHeaders = generateTraceHeaders();
    const utReporter = createUTReporter({
      endpoint: String(endpoint),
      package: initOpts?.package ?? "uploadthing/client",
      url: resolveMaybeUrlArg(initOpts?.url),
      headers: opts.headers,
      traceHeaders
    });
    const fetchFn = initOpts?.fetch ?? window.fetch;
    const presigneds = await runPromise(utReporter("upload", {
      input: "input" in opts ? opts.input : null,
      files: opts.files.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
        lastModified: f.lastModified
      }))
    }).pipe(provideService(FetchContext, fetchFn)));
    const totalSize = opts.files.reduce((acc, f) => acc + f.size, 0);
    let totalLoaded = 0;
    const uploadEffect = (file, presigned) => uploadFile(file, presigned, {
      traceHeaders,
      onUploadProgress: (progressEvent) => {
        totalLoaded += progressEvent.delta;
        opts.onUploadProgress?.({
          ...progressEvent,
          file,
          progress: Math.round(progressEvent.loaded / file.size * 100),
          totalLoaded,
          totalProgress: Math.round(totalLoaded / totalSize * 100)
        });
      }
    }).pipe(provideService(FetchContext, fetchFn));
    for (const [i, p] of presigneds.entries()) {
      const file = opts.files[i];
      if (!file) continue;
      const deferred = createDeferred();
      uploads.set(file, {
        deferred,
        presigned: p
      });
      runPromiseExit(uploadEffect(file, p), { signal: deferred.ac.signal }).then((result) => {
        if (result._tag === "Success") return deferred.resolve(result.value);
        else if (result.cause._tag === "Interrupt") throw new UploadPausedError();
        throw causeSquash(result.cause);
      }).catch((err) => {
        if (err instanceof UploadPausedError) return;
        deferred.reject(err);
      });
    }
    const pauseUpload = (file) => {
      const files = ensure(file ?? opts.files);
      for (const file$1 of files) {
        const upload = uploads.get(file$1);
        if (!upload) return;
        if (upload.deferred.ac.signal.aborted) throw new UploadAbortedError();
        upload.deferred.ac.abort();
      }
    };
    const resumeUpload = (file) => {
      const files = ensure(file ?? opts.files);
      for (const file$1 of files) {
        const upload = uploads.get(file$1);
        if (!upload) throw "No upload found";
        upload.deferred.ac = new AbortController();
        runPromiseExit(uploadEffect(file$1, upload.presigned), { signal: upload.deferred.ac.signal }).then((result) => {
          if (result._tag === "Success") return upload.deferred.resolve(result.value);
          else if (result.cause._tag === "Interrupt") throw new UploadPausedError();
          throw causeSquash(result.cause);
        }).catch((err) => {
          if (err instanceof UploadPausedError) return;
          upload.deferred.reject(err);
        });
      }
    };
    const done = async (file) => {
      const promises = [];
      const files = ensure(file ?? opts.files);
      for (const file$1 of files) {
        const upload = uploads.get(file$1);
        if (!upload) throw "No upload found";
        promises.push(upload.deferred.promise);
      }
      const results = await Promise.all(promises);
      return file ? results[0] : results;
    };
    return {
      pauseUpload,
      resumeUpload,
      done
    };
  };
  const typedUploadFiles = (slug, opts) => {
    const endpoint = typeof slug === "function" ? slug(routeRegistry) : slug;
    const fetchFn = initOpts?.fetch ?? window.fetch;
    return uploadFilesInternal(endpoint, {
      ...opts,
      skipPolling: {},
      url: resolveMaybeUrlArg(initOpts?.url),
      package: initOpts?.package ?? "uploadthing/client",
      input: opts.input
    }).pipe(provideService(FetchContext, fetchFn), (effect) => runPromiseExit(effect, opts.signal && { signal: opts.signal })).then((exit2) => {
      if (exit2._tag === "Success") return exit2.value;
      else if (exit2.cause._tag === "Interrupt") throw new UploadAbortedError();
      throw causeSquash(exit2.cause);
    });
  };
  return {
    uploadFiles: typedUploadFiles,
    createUpload: controllableUpload,
    routeRegistry
  };
};
export {
  UploadAbortedError,
  UploadPausedError,
  allowedContentTextLabelGenerator,
  bytesToFileSize,
  genUploader,
  generateClientDropzoneAccept,
  generateMimeTypes,
  generatePermittedFileTypes,
  isValidFileSize,
  isValidFileType,
  version$1 as version
};
