import { describe, it, expect } from 'vitest';
import {
  safeEvaluate,
  safeEvaluateCondition,
  SafeEvaluationError,
} from '../SafeEvaluator';

describe('SafeEvaluator', () => {
  describe('safeEvaluate', () => {
    describe('literals', () => {
      it('should evaluate numbers', () => {
        expect(safeEvaluate('42')).toBe(42);
        expect(safeEvaluate('3.14')).toBe(3.14);
        expect(safeEvaluate('-5')).toBe(-5);
        expect(safeEvaluate('1e10')).toBe(1e10);
      });

      it('should evaluate strings', () => {
        expect(safeEvaluate('"hello"')).toBe('hello');
        expect(safeEvaluate("'world'")).toBe('world');
        expect(safeEvaluate('"hello\\nworld"')).toBe('hello\nworld');
      });

      it('should evaluate booleans', () => {
        expect(safeEvaluate('true')).toBe(true);
        expect(safeEvaluate('false')).toBe(false);
      });

      it('should evaluate null and undefined', () => {
        expect(safeEvaluate('null')).toBe(null);
        expect(safeEvaluate('undefined')).toBe(undefined);
      });
    });

    describe('arithmetic operations', () => {
      it('should evaluate addition', () => {
        expect(safeEvaluate('2 + 3')).toBe(5);
        expect(safeEvaluate('10 + 20 + 30')).toBe(60);
      });

      it('should evaluate subtraction', () => {
        expect(safeEvaluate('10 - 3')).toBe(7);
        expect(safeEvaluate('100 - 50 - 25')).toBe(25);
      });

      it('should evaluate multiplication', () => {
        expect(safeEvaluate('4 * 5')).toBe(20);
        expect(safeEvaluate('2 * 3 * 4')).toBe(24);
      });

      it('should evaluate division', () => {
        expect(safeEvaluate('20 / 4')).toBe(5);
        expect(safeEvaluate('100 / 10 / 2')).toBe(5);
      });

      it('should evaluate modulo', () => {
        expect(safeEvaluate('17 % 5')).toBe(2);
        expect(safeEvaluate('10 % 3')).toBe(1);
      });

      it('should respect operator precedence', () => {
        expect(safeEvaluate('2 + 3 * 4')).toBe(14);
        expect(safeEvaluate('(2 + 3) * 4')).toBe(20);
        expect(safeEvaluate('10 - 4 / 2')).toBe(8);
      });
    });

    describe('comparison operations', () => {
      it('should evaluate less than', () => {
        expect(safeEvaluate('5 < 10')).toBe(true);
        expect(safeEvaluate('10 < 5')).toBe(false);
        expect(safeEvaluate('5 < 5')).toBe(false);
      });

      it('should evaluate greater than', () => {
        expect(safeEvaluate('10 > 5')).toBe(true);
        expect(safeEvaluate('5 > 10')).toBe(false);
        expect(safeEvaluate('5 > 5')).toBe(false);
      });

      it('should evaluate less than or equal', () => {
        expect(safeEvaluate('5 <= 10')).toBe(true);
        expect(safeEvaluate('5 <= 5')).toBe(true);
        expect(safeEvaluate('10 <= 5')).toBe(false);
      });

      it('should evaluate greater than or equal', () => {
        expect(safeEvaluate('10 >= 5')).toBe(true);
        expect(safeEvaluate('5 >= 5')).toBe(true);
        expect(safeEvaluate('5 >= 10')).toBe(false);
      });

      it('should evaluate equality', () => {
        expect(safeEvaluate('5 == 5')).toBe(true);
        expect(safeEvaluate('5 == "5"')).toBe(true);
        expect(safeEvaluate('5 === 5')).toBe(true);
        expect(safeEvaluate('5 === "5"')).toBe(false);
      });

      it('should evaluate inequality', () => {
        expect(safeEvaluate('5 != 10')).toBe(true);
        expect(safeEvaluate('5 != "5"')).toBe(false);
        expect(safeEvaluate('5 !== 10')).toBe(true);
        expect(safeEvaluate('5 !== "5"')).toBe(true);
      });
    });

    describe('logical operations', () => {
      it('should evaluate AND', () => {
        expect(safeEvaluate('true && true')).toBe(true);
        expect(safeEvaluate('true && false')).toBe(false);
        expect(safeEvaluate('false && true')).toBe(false);
        expect(safeEvaluate('false && false')).toBe(false);
      });

      it('should evaluate OR', () => {
        expect(safeEvaluate('true || true')).toBe(true);
        expect(safeEvaluate('true || false')).toBe(true);
        expect(safeEvaluate('false || true')).toBe(true);
        expect(safeEvaluate('false || false')).toBe(false);
      });

      it('should evaluate NOT', () => {
        expect(safeEvaluate('!true')).toBe(false);
        expect(safeEvaluate('!false')).toBe(true);
        expect(safeEvaluate('!!true')).toBe(true);
      });

      it('should evaluate nullish coalescing', () => {
        expect(safeEvaluate('null ?? "default"')).toBe('default');
        expect(safeEvaluate('undefined ?? "default"')).toBe('default');
        expect(safeEvaluate('"value" ?? "default"')).toBe('value');
        expect(safeEvaluate('0 ?? "default"')).toBe(0);
      });
    });

    describe('ternary operator', () => {
      it('should evaluate ternary expressions', () => {
        expect(safeEvaluate('true ? 1 : 2')).toBe(1);
        expect(safeEvaluate('false ? 1 : 2')).toBe(2);
        expect(safeEvaluate('5 > 3 ? "yes" : "no"')).toBe('yes');
        expect(safeEvaluate('5 < 3 ? "yes" : "no"')).toBe('no');
      });
    });

    describe('context variables', () => {
      it('should access context variables', () => {
        expect(safeEvaluate('x', { x: 42 })).toBe(42);
        expect(safeEvaluate('name', { name: 'Lisa' })).toBe('Lisa');
      });

      it('should use context in expressions', () => {
        expect(safeEvaluate('x + y', { x: 10, y: 20 })).toBe(30);
        expect(safeEvaluate('x > 5', { x: 10 })).toBe(true);
        expect(safeEvaluate('x > 5 && y < 10', { x: 10, y: 5 })).toBe(true);
      });
    });

    describe('property access', () => {
      it('should access object properties with dot notation', () => {
        const context = { user: { name: 'John', age: 30 } };
        expect(safeEvaluate('user.name', context)).toBe('John');
        expect(safeEvaluate('user.age', context)).toBe(30);
      });

      it('should access object properties with bracket notation', () => {
        const context = { user: { name: 'John' }, key: 'name' };
        expect(safeEvaluate('user["name"]', context)).toBe('John');
      });

      it('should handle nested properties', () => {
        const context = {
          data: {
            user: {
              profile: {
                email: 'john@example.com',
              },
            },
          },
        };
        expect(safeEvaluate('data.user.profile.email', context)).toBe('john@example.com');
      });

      it('should return undefined for missing properties', () => {
        const context = { user: { name: 'John' } };
        expect(safeEvaluate('user.missing', context)).toBe(undefined);
        expect(safeEvaluate('missing.property', context)).toBe(undefined);
      });
    });

    describe('safe function calls', () => {
      it('should allow Math functions', () => {
        expect(safeEvaluate('Math.abs(-5)')).toBe(5);
        expect(safeEvaluate('Math.max(1, 5, 3)')).toBe(5);
        expect(safeEvaluate('Math.min(1, 5, 3)')).toBe(1);
        expect(safeEvaluate('Math.floor(3.7)')).toBe(3);
        expect(safeEvaluate('Math.ceil(3.2)')).toBe(4);
        expect(safeEvaluate('Math.round(3.5)')).toBe(4);
      });

      it('should allow Number/String/Boolean conversions', () => {
        expect(safeEvaluate('Number("42")')).toBe(42);
        expect(safeEvaluate('String(42)')).toBe('42');
        expect(safeEvaluate('Boolean(1)')).toBe(true);
        expect(safeEvaluate('Boolean(0)')).toBe(false);
      });

      it('should allow parseInt and parseFloat', () => {
        expect(safeEvaluate('parseInt("42")')).toBe(42);
        expect(safeEvaluate('parseFloat("3.14")')).toBe(3.14);
      });

      it('should allow isNaN and isFinite', () => {
        expect(safeEvaluate('isNaN(NaN)')).toBe(true);
        expect(safeEvaluate('isNaN(42)')).toBe(false);
        expect(safeEvaluate('isFinite(42)')).toBe(true);
      });

      it('should allow Array.isArray', () => {
        expect(safeEvaluate('Array.isArray(arr)', { arr: [1, 2, 3] })).toBe(true);
        expect(safeEvaluate('Array.isArray(obj)', { obj: { a: 1 } })).toBe(false);
      });

      it('should allow Object.keys and Object.values', () => {
        const context = { obj: { a: 1, b: 2 } };
        const keys = safeEvaluate('Object.keys(obj)', context);
        expect(keys).toEqual(['a', 'b']);
      });

      it('should allow JSON.stringify', () => {
        const context = { obj: { a: 1 } };
        expect(safeEvaluate('JSON.stringify(obj)', context)).toBe('{"a":1}');
      });
    });
  });

  describe('security - blocked operations', () => {
    it('should block eval', () => {
      expect(() => safeEvaluate('eval("1+1")')).toThrow(SafeEvaluationError);
      expect(() => safeEvaluate('eval("alert(1)")')).toThrow(SafeEvaluationError);
    });

    it('should block Function constructor', () => {
      expect(() => safeEvaluate('Function("return 1")')).toThrow(SafeEvaluationError);
      expect(() => safeEvaluate('new Function("return 1")')).toThrow(SafeEvaluationError);
    });

    it('should block constructor access', () => {
      expect(() => safeEvaluate('constructor')).toThrow(SafeEvaluationError);
      expect(() => safeEvaluate('"".constructor')).toThrow(SafeEvaluationError);
      expect(() => safeEvaluate('[].constructor')).toThrow(SafeEvaluationError);
    });

    it('should block __proto__ access', () => {
      expect(() => safeEvaluate('__proto__')).toThrow(SafeEvaluationError);
      expect(() => safeEvaluate('obj.__proto__', { obj: {} })).toThrow(SafeEvaluationError);
    });

    it('should block prototype access', () => {
      expect(() => safeEvaluate('prototype')).toThrow(SafeEvaluationError);
      expect(() => safeEvaluate('Object.prototype')).toThrow(SafeEvaluationError);
    });

    it('should block require', () => {
      expect(() => safeEvaluate('require("fs")')).toThrow(SafeEvaluationError);
    });

    it('should block import', () => {
      expect(() => safeEvaluate('import("module")')).toThrow(SafeEvaluationError);
    });

    it('should block process access', () => {
      expect(() => safeEvaluate('process')).toThrow(SafeEvaluationError);
      expect(() => safeEvaluate('process.exit()')).toThrow(SafeEvaluationError);
    });

    it('should block global/globalThis/window', () => {
      expect(() => safeEvaluate('global')).toThrow(SafeEvaluationError);
      expect(() => safeEvaluate('globalThis')).toThrow(SafeEvaluationError);
      expect(() => safeEvaluate('window')).toThrow(SafeEvaluationError);
    });

    it('should block setTimeout/setInterval', () => {
      expect(() => safeEvaluate('setTimeout')).toThrow(SafeEvaluationError);
      expect(() => safeEvaluate('setInterval')).toThrow(SafeEvaluationError);
    });

    it('should block fetch/XMLHttpRequest/WebSocket', () => {
      expect(() => safeEvaluate('fetch("url")')).toThrow(SafeEvaluationError);
      expect(() => safeEvaluate('XMLHttpRequest')).toThrow(SafeEvaluationError);
      expect(() => safeEvaluate('WebSocket')).toThrow(SafeEvaluationError);
    });

    it('should block unsafe function calls', () => {
      expect(() => safeEvaluate('alert(1)')).toThrow(SafeEvaluationError);
      expect(() => safeEvaluate('console.log("test")')).toThrow(SafeEvaluationError);
    });

    it('should block constructor.constructor trick', () => {
      expect(() => safeEvaluate('constructor.constructor("return this")()')).toThrow(SafeEvaluationError);
    });
  });

  describe('safeEvaluateCondition', () => {
    it('should return boolean for truthy values', () => {
      expect(safeEvaluateCondition('true')).toBe(true);
      expect(safeEvaluateCondition('1')).toBe(true);
      expect(safeEvaluateCondition('"hello"')).toBe(true);
      expect(safeEvaluateCondition('5 > 3')).toBe(true);
    });

    it('should return boolean for falsy values', () => {
      expect(safeEvaluateCondition('false')).toBe(false);
      expect(safeEvaluateCondition('0')).toBe(false);
      expect(safeEvaluateCondition('""')).toBe(false);
      expect(safeEvaluateCondition('null')).toBe(false);
      expect(safeEvaluateCondition('5 < 3')).toBe(false);
    });

    it('should evaluate complex conditions with context', () => {
      const context = { user: { age: 25, isActive: true } };
      expect(safeEvaluateCondition('user.age >= 18 && user.isActive', context)).toBe(true);
      expect(safeEvaluateCondition('user.age >= 30 || !user.isActive', context)).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should throw SafeEvaluationError for invalid expressions', () => {
      expect(() => safeEvaluate('')).toThrow(SafeEvaluationError);
      expect(() => safeEvaluate('+')).toThrow(SafeEvaluationError);
      expect(() => safeEvaluate('1 +')).toThrow(SafeEvaluationError);
    });

    it('should throw SafeEvaluationError for unterminated strings', () => {
      expect(() => safeEvaluate('"hello')).toThrow(SafeEvaluationError);
      expect(() => safeEvaluate("'world")).toThrow(SafeEvaluationError);
    });

    it('should throw for non-string expressions', () => {
      expect(() => safeEvaluate(null as unknown as string)).toThrow(SafeEvaluationError);
      expect(() => safeEvaluate(undefined as unknown as string)).toThrow(SafeEvaluationError);
      expect(() => safeEvaluate(123 as unknown as string)).toThrow(SafeEvaluationError);
    });
  });
});
