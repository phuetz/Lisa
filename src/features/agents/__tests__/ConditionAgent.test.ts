/**
 * Tests for ConditionAgent - Security and Functionality
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ConditionAgent, SafeExpressionEvaluator } from '../implementations/ConditionAgent';

describe('ConditionAgent', () => {
  let agent: ConditionAgent;

  beforeEach(() => {
    agent = new ConditionAgent();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('ConditionAgent');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe('analysis');
    });

    it('should have capabilities', () => {
      expect(agent.capabilities).toContain('evaluateCondition');
      expect(agent.capabilities).toContain('validateCondition');
    });
  });

  describe('Simple comparisons', () => {
    it('should evaluate equals', async () => {
      const result = await agent.execute({
        intent: 'evaluateCondition',
        parameters: {
          condition: 'value === 5',
          input: null,
          context: { value: 5 }
        }
      });
      expect(result.success).toBe(true);
      expect(result.output.result).toBe(true);
    });

    it('should evaluate not equals', async () => {
      const result = await agent.execute({
        intent: 'evaluateCondition',
        parameters: {
          condition: 'value !== 5',
          input: null,
          context: { value: 10 }
        }
      });
      expect(result.success).toBe(true);
      expect(result.output.result).toBe(true);
    });

    it('should evaluate less than', async () => {
      const result = await agent.execute({
        intent: 'evaluateCondition',
        parameters: {
          condition: 'age < 18',
          input: null,
          context: { age: 15 }
        }
      });
      expect(result.success).toBe(true);
      expect(result.output.result).toBe(true);
    });

    it('should evaluate greater than or equal', async () => {
      const result = await agent.execute({
        intent: 'evaluateCondition',
        parameters: {
          condition: 'score >= 60',
          input: null,
          context: { score: 60 }
        }
      });
      expect(result.success).toBe(true);
      expect(result.output.result).toBe(true);
    });

    it('should evaluate string comparison', async () => {
      const result = await agent.execute({
        intent: 'evaluateCondition',
        parameters: {
          condition: "status === 'active'",
          input: null,
          context: { status: 'active' }
        }
      });
      expect(result.success).toBe(true);
      expect(result.output.result).toBe(true);
    });
  });

  describe('Logical operators', () => {
    it('should evaluate AND', async () => {
      const result = await agent.execute({
        intent: 'evaluateCondition',
        parameters: {
          condition: 'age >= 18 && hasLicense === true',
          input: null,
          context: { age: 21, hasLicense: true }
        }
      });
      expect(result.success).toBe(true);
      expect(result.output.result).toBe(true);
    });

    it('should evaluate OR', async () => {
      const result = await agent.execute({
        intent: 'evaluateCondition',
        parameters: {
          condition: 'isAdmin === true || isModerator === true',
          input: null,
          context: { isAdmin: false, isModerator: true }
        }
      });
      expect(result.success).toBe(true);
      expect(result.output.result).toBe(true);
    });

    it('should evaluate NOT', async () => {
      const result = await agent.execute({
        intent: 'evaluateCondition',
        parameters: {
          condition: '!isBlocked',
          input: null,
          context: { isBlocked: false }
        }
      });
      expect(result.success).toBe(true);
      expect(result.output.result).toBe(true);
    });
  });

  describe('Nested property access', () => {
    it('should access nested properties', async () => {
      const result = await agent.execute({
        intent: 'evaluateCondition',
        parameters: {
          condition: 'user.profile.age >= 18',
          input: null,
          context: { user: { profile: { age: 25 } } }
        }
      });
      expect(result.success).toBe(true);
      expect(result.output.result).toBe(true);
    });

    it('should handle input variable', async () => {
      const result = await agent.execute({
        intent: 'evaluateCondition',
        parameters: {
          condition: 'input.value > 100',
          input: { value: 150 },
          context: {}
        }
      });
      expect(result.success).toBe(true);
      expect(result.output.result).toBe(true);
    });
  });

  describe('Arithmetic expressions', () => {
    it('should evaluate addition', async () => {
      const result = await agent.execute({
        intent: 'evaluateCondition',
        parameters: {
          condition: 'a + b > 10',
          input: null,
          context: { a: 5, b: 7 }
        }
      });
      expect(result.success).toBe(true);
      expect(result.output.result).toBe(true);
    });

    it('should evaluate multiplication', async () => {
      const result = await agent.execute({
        intent: 'evaluateCondition',
        parameters: {
          condition: 'price * quantity >= 100',
          input: null,
          context: { price: 25, quantity: 4 }
        }
      });
      expect(result.success).toBe(true);
      expect(result.output.result).toBe(true);
    });
  });

  describe('Boolean literals', () => {
    it('should handle true literal', async () => {
      const result = await agent.execute({
        intent: 'evaluateCondition',
        parameters: {
          condition: 'true',
          input: null,
          context: {}
        }
      });
      expect(result.success).toBe(true);
      expect(result.output.result).toBe(true);
    });

    it('should handle false literal', async () => {
      const result = await agent.execute({
        intent: 'evaluateCondition',
        parameters: {
          condition: 'false',
          input: null,
          context: {}
        }
      });
      expect(result.success).toBe(true);
      expect(result.output.result).toBe(false);
    });
  });

  describe('validateCondition intent', () => {
    it('should validate a safe condition', async () => {
      const result = await agent.execute({
        intent: 'validateCondition',
        parameters: { condition: 'value > 5' }
      });
      expect(result.success).toBe(true);
      expect(result.output.valid).toBe(true);
    });

    it('should reject unsafe condition', async () => {
      const result = await agent.execute({
        intent: 'validateCondition',
        parameters: { condition: 'eval("alert(1)")' }
      });
      expect(result.success).toBe(true);
      expect(result.output.valid).toBe(false);
    });
  });
});

describe('SafeExpressionEvaluator - Security Tests', () => {
  describe('Code injection prevention', () => {
    it('should block eval()', () => {
      const validation = SafeExpressionEvaluator.validate('eval("malicious")');
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Unsafe pattern');
    });

    it('should block Function constructor', () => {
      const validation = SafeExpressionEvaluator.validate('Function("return 1")');
      expect(validation.valid).toBe(false);
    });

    it('should block window access', () => {
      const validation = SafeExpressionEvaluator.validate('window.location');
      expect(validation.valid).toBe(false);
    });

    it('should block document access', () => {
      const validation = SafeExpressionEvaluator.validate('document.cookie');
      expect(validation.valid).toBe(false);
    });

    it('should block globalThis access', () => {
      const validation = SafeExpressionEvaluator.validate('globalThis.fetch');
      expect(validation.valid).toBe(false);
    });

    it('should block process access', () => {
      const validation = SafeExpressionEvaluator.validate('process.env');
      expect(validation.valid).toBe(false);
    });

    it('should block require', () => {
      const validation = SafeExpressionEvaluator.validate('require("fs")');
      expect(validation.valid).toBe(false);
    });

    it('should block import', () => {
      const validation = SafeExpressionEvaluator.validate('import("module")');
      expect(validation.valid).toBe(false);
    });

    it('should block __proto__ access', () => {
      const validation = SafeExpressionEvaluator.validate('obj.__proto__');
      expect(validation.valid).toBe(false);
    });

    it('should block constructor access', () => {
      const validation = SafeExpressionEvaluator.validate('obj.constructor');
      expect(validation.valid).toBe(false);
    });

    it('should block prototype access', () => {
      const validation = SafeExpressionEvaluator.validate('obj.prototype');
      expect(validation.valid).toBe(false);
    });

    it('should block template literals', () => {
      const validation = SafeExpressionEvaluator.validate('`${code}`');
      expect(validation.valid).toBe(false);
    });

    it('should block assignment operators', () => {
      const validation = SafeExpressionEvaluator.validate('x = 5');
      expect(validation.valid).toBe(false);
    });

    it('should block increment operators', () => {
      const validation = SafeExpressionEvaluator.validate('x++');
      expect(validation.valid).toBe(false);
    });

    it('should block decrement operators', () => {
      const validation = SafeExpressionEvaluator.validate('x--');
      expect(validation.valid).toBe(false);
    });

    it('should block this keyword', () => {
      const validation = SafeExpressionEvaluator.validate('this.secret');
      expect(validation.valid).toBe(false);
    });

    it('should block new keyword', () => {
      const validation = SafeExpressionEvaluator.validate('new Date()');
      expect(validation.valid).toBe(false);
    });

    it('should block arrow functions', () => {
      const validation = SafeExpressionEvaluator.validate('() => alert(1)');
      expect(validation.valid).toBe(false);
    });

    it('should block function keyword', () => {
      const validation = SafeExpressionEvaluator.validate('function() { return 1 }');
      expect(validation.valid).toBe(false);
    });

    it('should block bracket notation', () => {
      const validation = SafeExpressionEvaluator.validate('obj["constructor"]');
      expect(validation.valid).toBe(false);
    });

    it('should block function calls', () => {
      const validation = SafeExpressionEvaluator.validate('someFunc()');
      expect(validation.valid).toBe(false);
    });
  });

  describe('Safe expressions should pass', () => {
    it('should allow simple comparison', () => {
      const validation = SafeExpressionEvaluator.validate('value > 5');
      expect(validation.valid).toBe(true);
    });

    it('should allow string comparison', () => {
      const validation = SafeExpressionEvaluator.validate("status === 'active'");
      expect(validation.valid).toBe(true);
    });

    it('should allow logical operators', () => {
      const validation = SafeExpressionEvaluator.validate('a > 5 && b < 10');
      expect(validation.valid).toBe(true);
    });

    it('should allow nested property access', () => {
      const validation = SafeExpressionEvaluator.validate('user.profile.age >= 18');
      expect(validation.valid).toBe(true);
    });

    it('should allow boolean literals', () => {
      const validation = SafeExpressionEvaluator.validate('isActive === true');
      expect(validation.valid).toBe(true);
    });

    it('should allow numeric literals', () => {
      const validation = SafeExpressionEvaluator.validate('count >= 100');
      expect(validation.valid).toBe(true);
    });

    it('should allow arithmetic', () => {
      const validation = SafeExpressionEvaluator.validate('a + b > 10');
      expect(validation.valid).toBe(true);
    });

    it('should allow NOT operator', () => {
      const validation = SafeExpressionEvaluator.validate('!isBlocked');
      expect(validation.valid).toBe(true);
    });

    it('should allow complex safe expressions', () => {
      const validation = SafeExpressionEvaluator.validate(
        "(age >= 18 && hasLicense === true) || isExempt === true"
      );
      expect(validation.valid).toBe(true);
    });
  });

  describe('Evaluation edge cases', () => {
    it('should handle undefined values gracefully', () => {
      const result = SafeExpressionEvaluator.evaluate(
        'missing === undefined',
        null,
        {}
      );
      expect(result).toBe(true);
    });

    it('should handle null comparison', () => {
      const result = SafeExpressionEvaluator.evaluate(
        'value === null',
        null,
        { value: null }
      );
      expect(result).toBe(true);
    });

    it('should handle falsy values correctly', () => {
      const result = SafeExpressionEvaluator.evaluate(
        'count === 0',
        null,
        { count: 0 }
      );
      expect(result).toBe(true);
    });

    it('should handle empty string', () => {
      const result = SafeExpressionEvaluator.evaluate(
        "name === ''",
        null,
        { name: '' }
      );
      expect(result).toBe(true);
    });
  });
});
