/**
 * SafeEvaluator.ts
 * Secure expression evaluator that replaces dangerous eval() and new Function()
 *
 * Supports:
 * - Comparison operators: ==, ===, !=, !==, <, >, <=, >=
 * - Logical operators: &&, ||, !
 * - Arithmetic operators: +, -, *, /, %
 * - Property access: obj.prop, obj['prop']
 * - Literals: numbers, strings, booleans, null, undefined
 * - Parentheses for grouping
 *
 * Blocks:
 * - Function calls (except safe whitelist)
 * - Constructor access
 * - eval, Function, etc.
 * - __proto__, prototype, constructor access
 */

type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'BOOLEAN'
  | 'NULL'
  | 'UNDEFINED'
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'DOT'
  | 'COMMA'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string | number | boolean | null;
  raw: string;
}

type ASTNode =
  | { type: 'Literal'; value: unknown }
  | { type: 'Identifier'; name: string }
  | { type: 'MemberExpression'; object: ASTNode; property: ASTNode; computed: boolean }
  | { type: 'UnaryExpression'; operator: string; argument: ASTNode }
  | { type: 'BinaryExpression'; operator: string; left: ASTNode; right: ASTNode }
  | { type: 'LogicalExpression'; operator: string; left: ASTNode; right: ASTNode }
  | { type: 'ConditionalExpression'; test: ASTNode; consequent: ASTNode; alternate: ASTNode }
  | { type: 'CallExpression'; callee: ASTNode; arguments: ASTNode[] };

// Dangerous identifiers that should never be accessed
const BLOCKED_IDENTIFIERS = new Set([
  'eval',
  'Function',
  'constructor',
  '__proto__',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
  'require',
  'import',
  'module',
  'exports',
  'global',
  'globalThis',
  'window',
  'document',
  'process',
  'Buffer',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'clearImmediate',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
]);

// Safe functions that can be called
const SAFE_FUNCTIONS = new Set([
  'Math.abs',
  'Math.ceil',
  'Math.floor',
  'Math.round',
  'Math.max',
  'Math.min',
  'Math.pow',
  'Math.sqrt',
  'Math.random',
  'Number',
  'String',
  'Boolean',
  'Array.isArray',
  'Object.keys',
  'Object.values',
  'JSON.stringify',
  'JSON.parse',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
]);

export class SafeEvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SafeEvaluationError';
  }
}

class Tokenizer {
  private input: string;
  private pos: number = 0;

  constructor(input: string) {
    this.input = input;
  }

  private isWhitespace(ch: string): boolean {
    return /\s/.test(ch);
  }

  private isDigit(ch: string): boolean {
    return /[0-9]/.test(ch);
  }

  private isIdentifierStart(ch: string): boolean {
    return /[a-zA-Z_$]/.test(ch);
  }

  private isIdentifierPart(ch: string): boolean {
    return /[a-zA-Z0-9_$]/.test(ch);
  }

  private peek(offset: number = 0): string {
    return this.input[this.pos + offset] ?? '';
  }

  private advance(): string {
    return this.input[this.pos++] ?? '';
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && this.isWhitespace(this.peek())) {
      this.advance();
    }
  }

  private readNumber(): Token {
    let value = '';
    const start = this.pos;

    while (this.isDigit(this.peek()) || this.peek() === '.') {
      value += this.advance();
    }

    // Handle scientific notation
    if (this.peek() === 'e' || this.peek() === 'E') {
      value += this.advance();
      if (this.peek() === '+' || this.peek() === '-') {
        value += this.advance();
      }
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    return {
      type: 'NUMBER',
      value: parseFloat(value),
      raw: this.input.slice(start, this.pos),
    };
  }

  private readString(quote: string): Token {
    const start = this.pos;
    this.advance(); // Skip opening quote
    let value = '';

    while (this.pos < this.input.length && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance();
        const escaped = this.advance();
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          case "'": value += "'"; break;
          default: value += escaped;
        }
      } else {
        value += this.advance();
      }
    }

    if (this.peek() !== quote) {
      throw new SafeEvaluationError('Unterminated string literal');
    }
    this.advance(); // Skip closing quote

    return {
      type: 'STRING',
      value,
      raw: this.input.slice(start, this.pos),
    };
  }

  private readIdentifier(): Token {
    const start = this.pos;
    let value = '';

    while (this.pos < this.input.length && this.isIdentifierPart(this.peek())) {
      value += this.advance();
    }

    // Check for keywords
    if (value === 'true') {
      return { type: 'BOOLEAN', value: true, raw: value };
    }
    if (value === 'false') {
      return { type: 'BOOLEAN', value: false, raw: value };
    }
    if (value === 'null') {
      return { type: 'NULL', value: null, raw: value };
    }
    if (value === 'undefined') {
      return { type: 'UNDEFINED', value: undefined, raw: value };
    }

    return { type: 'IDENTIFIER', value, raw: this.input.slice(start, this.pos) };
  }

  private readOperator(): Token {
    const start = this.pos;
    const ch = this.peek();
    const next = this.peek(1);
    const third = this.peek(2);

    // Three-character operators
    if (ch === '=' && next === '=' && third === '=') {
      this.pos += 3;
      return { type: 'OPERATOR', value: '===', raw: '===' };
    }
    if (ch === '!' && next === '=' && third === '=') {
      this.pos += 3;
      return { type: 'OPERATOR', value: '!==', raw: '!==' };
    }

    // Two-character operators
    const twoChar = ch + next;
    if (['==', '!=', '<=', '>=', '&&', '||', '??'].includes(twoChar)) {
      this.pos += 2;
      return { type: 'OPERATOR', value: twoChar, raw: twoChar };
    }

    // Single-character operators
    if (['+', '-', '*', '/', '%', '<', '>', '!', '?', ':'].includes(ch)) {
      this.advance();
      return { type: 'OPERATOR', value: ch, raw: ch };
    }

    throw new SafeEvaluationError(`Unknown operator at position ${start}: ${ch}`);
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.input.length) {
      this.skipWhitespace();
      if (this.pos >= this.input.length) break;

      const ch = this.peek();

      if (this.isDigit(ch) || (ch === '.' && this.isDigit(this.peek(1)))) {
        tokens.push(this.readNumber());
      } else if (ch === '"' || ch === "'") {
        tokens.push(this.readString(ch));
      } else if (this.isIdentifierStart(ch)) {
        tokens.push(this.readIdentifier());
      } else if (ch === '(') {
        tokens.push({ type: 'LPAREN', value: '(', raw: '(' });
        this.advance();
      } else if (ch === ')') {
        tokens.push({ type: 'RPAREN', value: ')', raw: ')' });
        this.advance();
      } else if (ch === '[') {
        tokens.push({ type: 'LBRACKET', value: '[', raw: '[' });
        this.advance();
      } else if (ch === ']') {
        tokens.push({ type: 'RBRACKET', value: ']', raw: ']' });
        this.advance();
      } else if (ch === '.') {
        tokens.push({ type: 'DOT', value: '.', raw: '.' });
        this.advance();
      } else if (ch === ',') {
        tokens.push({ type: 'COMMA', value: ',', raw: ',' });
        this.advance();
      } else {
        tokens.push(this.readOperator());
      }
    }

    tokens.push({ type: 'EOF', value: null, raw: '' });
    return tokens;
  }
}

class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: 'EOF', value: null, raw: '' };
  }

  private advance(): Token {
    return this.tokens[this.pos++] ?? { type: 'EOF', value: null, raw: '' };
  }

  private expect(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new SafeEvaluationError(`Expected ${type} but got ${token.type}`);
    }
    return this.advance();
  }

  public parse(): ASTNode {
    const result = this.parseExpression();
    if (this.peek().type !== 'EOF') {
      throw new SafeEvaluationError(`Unexpected token: ${this.peek().raw}`);
    }
    return result;
  }

  private parseExpression(): ASTNode {
    return this.parseTernary();
  }

  private parseTernary(): ASTNode {
    let node = this.parseLogicalOr();

    if (this.peek().value === '?') {
      this.advance(); // consume '?'
      const consequent = this.parseExpression();
      this.expect('OPERATOR'); // expect ':'
      const alternate = this.parseExpression();
      node = { type: 'ConditionalExpression', test: node, consequent, alternate };
    }

    return node;
  }

  private parseLogicalOr(): ASTNode {
    let left = this.parseLogicalAnd();

    while (this.peek().value === '||' || this.peek().value === '??') {
      const operator = this.advance().value as string;
      const right = this.parseLogicalAnd();
      left = { type: 'LogicalExpression', operator, left, right };
    }

    return left;
  }

  private parseLogicalAnd(): ASTNode {
    let left = this.parseEquality();

    while (this.peek().value === '&&') {
      const operator = this.advance().value as string;
      const right = this.parseEquality();
      left = { type: 'LogicalExpression', operator, left, right };
    }

    return left;
  }

  private parseEquality(): ASTNode {
    let left = this.parseComparison();

    while (['==', '!=', '===', '!=='].includes(this.peek().value as string)) {
      const operator = this.advance().value as string;
      const right = this.parseComparison();
      left = { type: 'BinaryExpression', operator, left, right };
    }

    return left;
  }

  private parseComparison(): ASTNode {
    let left = this.parseAdditive();

    while (['<', '>', '<=', '>='].includes(this.peek().value as string)) {
      const operator = this.advance().value as string;
      const right = this.parseAdditive();
      left = { type: 'BinaryExpression', operator, left, right };
    }

    return left;
  }

  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();

    while (['+', '-'].includes(this.peek().value as string)) {
      const operator = this.advance().value as string;
      const right = this.parseMultiplicative();
      left = { type: 'BinaryExpression', operator, left, right };
    }

    return left;
  }

  private parseMultiplicative(): ASTNode {
    let left = this.parseUnary();

    while (['*', '/', '%'].includes(this.peek().value as string)) {
      const operator = this.advance().value as string;
      const right = this.parseUnary();
      left = { type: 'BinaryExpression', operator, left, right };
    }

    return left;
  }

  private parseUnary(): ASTNode {
    if (this.peek().value === '!' || this.peek().value === '-' || this.peek().value === '+') {
      const operator = this.advance().value as string;
      const argument = this.parseUnary();
      return { type: 'UnaryExpression', operator, argument };
    }

    return this.parseCallExpression();
  }

  private parseCallExpression(): ASTNode {
    let node = this.parseMemberExpression();

    while (this.peek().type === 'LPAREN') {
      this.advance(); // consume '('
      const args: ASTNode[] = [];

      if (this.peek().type !== 'RPAREN') {
        args.push(this.parseExpression());
        while (this.peek().type === 'COMMA') {
          this.advance(); // consume ','
          args.push(this.parseExpression());
        }
      }

      this.expect('RPAREN');
      node = { type: 'CallExpression', callee: node, arguments: args };
    }

    return node;
  }

  private parseMemberExpression(): ASTNode {
    let node = this.parsePrimary();

    while (true) {
      if (this.peek().type === 'DOT') {
        this.advance(); // consume '.'
        const property = this.expect('IDENTIFIER');
        node = {
          type: 'MemberExpression',
          object: node,
          property: { type: 'Literal', value: property.value },
          computed: false,
        };
      } else if (this.peek().type === 'LBRACKET') {
        this.advance(); // consume '['
        const property = this.parseExpression();
        this.expect('RBRACKET');
        node = {
          type: 'MemberExpression',
          object: node,
          property,
          computed: true,
        };
      } else {
        break;
      }
    }

    return node;
  }

  private parsePrimary(): ASTNode {
    const token = this.peek();

    switch (token.type) {
      case 'NUMBER':
      case 'STRING':
      case 'BOOLEAN':
      case 'NULL':
      case 'UNDEFINED':
        this.advance();
        return { type: 'Literal', value: token.value };

      case 'IDENTIFIER':
        this.advance();
        return { type: 'Identifier', name: token.value as string };

      case 'LPAREN': {
        this.advance(); // consume '('
        const expr = this.parseExpression();
        this.expect('RPAREN');
        return expr;
      }

      default:
        throw new SafeEvaluationError(`Unexpected token: ${token.raw}`);
    }
  }
}

class Evaluator {
  private context: Record<string, unknown>;

  constructor(context: Record<string, unknown>) {
    this.context = context;
  }

  public evaluate(node: ASTNode): unknown {
    switch (node.type) {
      case 'Literal':
        return node.value;

      case 'Identifier':
        return this.evaluateIdentifier(node.name);

      case 'MemberExpression':
        return this.evaluateMemberExpression(node);

      case 'UnaryExpression':
        return this.evaluateUnaryExpression(node);

      case 'BinaryExpression':
        return this.evaluateBinaryExpression(node);

      case 'LogicalExpression':
        return this.evaluateLogicalExpression(node);

      case 'ConditionalExpression':
        return this.evaluate(node.test)
          ? this.evaluate(node.consequent)
          : this.evaluate(node.alternate);

      case 'CallExpression':
        return this.evaluateCallExpression(node);

      default:
        throw new SafeEvaluationError(`Unknown node type: ${(node as ASTNode).type}`);
    }
  }

  private evaluateIdentifier(name: string): unknown {
    if (BLOCKED_IDENTIFIERS.has(name)) {
      throw new SafeEvaluationError(`Access to '${name}' is not allowed`);
    }

    // Check for safe globals
    if (name === 'Math') return Math;
    if (name === 'Number') return Number;
    if (name === 'String') return String;
    if (name === 'Boolean') return Boolean;
    if (name === 'Array') return Array;
    if (name === 'Object') return Object;
    if (name === 'JSON') return JSON;
    if (name === 'parseInt') return parseInt;
    if (name === 'parseFloat') return parseFloat;
    if (name === 'isNaN') return isNaN;
    if (name === 'isFinite') return isFinite;

    // Check context
    if (name in this.context) {
      return this.context[name];
    }

    return undefined;
  }

  private evaluateMemberExpression(node: { object: ASTNode; property: ASTNode; computed: boolean }): unknown {
    const object = this.evaluate(node.object);

    if (object === null || object === undefined) {
      return undefined;
    }

    const property = node.computed
      ? this.evaluate(node.property)
      : (node.property as { value: unknown }).value;

    // Block dangerous property access
    const propStr = String(property);
    if (BLOCKED_IDENTIFIERS.has(propStr)) {
      throw new SafeEvaluationError(`Access to '${propStr}' is not allowed`);
    }

    // Safely access property on objects and functions (for static methods like Array.isArray)
    if ((typeof object === 'object' || typeof object === 'function') && object !== null) {
      return (object as Record<string, unknown>)[propStr];
    }

    return undefined;
  }

  private evaluateUnaryExpression(node: { operator: string; argument: ASTNode }): unknown {
    const argument = this.evaluate(node.argument);

    switch (node.operator) {
      case '!':
        return !argument;
      case '-':
        return -(argument as number);
      case '+':
        return +(argument as number);
      default:
        throw new SafeEvaluationError(`Unknown unary operator: ${node.operator}`);
    }
  }

  private evaluateBinaryExpression(node: { operator: string; left: ASTNode; right: ASTNode }): unknown {
    const left = this.evaluate(node.left);
    const right = this.evaluate(node.right);

    switch (node.operator) {
      case '+':
        return (left as number) + (right as number);
      case '-':
        return (left as number) - (right as number);
      case '*':
        return (left as number) * (right as number);
      case '/':
        return (left as number) / (right as number);
      case '%':
        return (left as number) % (right as number);
      case '<':
        return (left as number) < (right as number);
      case '>':
        return (left as number) > (right as number);
      case '<=':
        return (left as number) <= (right as number);
      case '>=':
        return (left as number) >= (right as number);
      case '==':
        return left == right;
      case '!=':
        return left != right;
      case '===':
        return left === right;
      case '!==':
        return left !== right;
      default:
        throw new SafeEvaluationError(`Unknown binary operator: ${node.operator}`);
    }
  }

  private evaluateLogicalExpression(node: { operator: string; left: ASTNode; right: ASTNode }): unknown {
    const left = this.evaluate(node.left);

    switch (node.operator) {
      case '&&':
        return left ? this.evaluate(node.right) : left;
      case '||':
        return left ? left : this.evaluate(node.right);
      case '??':
        return left != null ? left : this.evaluate(node.right);
      default:
        throw new SafeEvaluationError(`Unknown logical operator: ${node.operator}`);
    }
  }

  private evaluateCallExpression(node: { callee: ASTNode; arguments: ASTNode[] }): unknown {
    // Get the function path for whitelist check
    const funcPath = this.getFunctionPath(node.callee);

    if (!SAFE_FUNCTIONS.has(funcPath)) {
      throw new SafeEvaluationError(`Function call '${funcPath}' is not allowed`);
    }

    const func = this.evaluate(node.callee);

    if (typeof func !== 'function') {
      throw new SafeEvaluationError(`'${funcPath}' is not a function`);
    }

    const args = node.arguments.map(arg => this.evaluate(arg));

    // Get the correct 'this' context for method calls
    let thisArg: unknown = undefined;
    if (node.callee.type === 'MemberExpression') {
      thisArg = this.evaluate(node.callee.object);
    }

    return func.apply(thisArg, args);
  }

  private getFunctionPath(node: ASTNode): string {
    if (node.type === 'Identifier') {
      return node.name;
    }
    if (node.type === 'MemberExpression') {
      const objPath = this.getFunctionPath(node.object);
      const prop = node.computed
        ? String(this.evaluate(node.property))
        : String((node.property as { value: unknown }).value);
      return `${objPath}.${prop}`;
    }
    return '';
  }
}

/**
 * Safely evaluate an expression with the given context
 *
 * @param expression - The expression to evaluate
 * @param context - Variables available in the expression
 * @returns The result of the expression
 * @throws SafeEvaluationError if the expression is invalid or uses blocked features
 *
 * @example
 * // Simple comparison
 * safeEvaluate('x > 5', { x: 10 }) // true
 *
 * // Property access
 * safeEvaluate('user.age >= 18', { user: { age: 21 } }) // true
 *
 * // Math operations
 * safeEvaluate('Math.max(a, b)', { a: 5, b: 10 }) // 10
 *
 * // Blocked - will throw
 * safeEvaluate('eval("alert(1)")', {}) // throws SafeEvaluationError
 */
export function safeEvaluate(expression: string, context: Record<string, unknown> = {}): unknown {
  if (!expression || typeof expression !== 'string') {
    throw new SafeEvaluationError('Expression must be a non-empty string');
  }

  // Quick check for obviously dangerous patterns
  const dangerousPatterns = [
    /\beval\s*\(/i,
    /\bFunction\s*\(/i,
    /\bconstructor\b/i,
    /\b__proto__\b/i,
    /\bprototype\b/i,
    /\bimport\s*\(/i,
    /\brequire\s*\(/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(expression)) {
      throw new SafeEvaluationError(`Expression contains blocked pattern: ${pattern.source}`);
    }
  }

  try {
    const tokenizer = new Tokenizer(expression);
    const tokens = tokenizer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    const evaluator = new Evaluator(context);
    return evaluator.evaluate(ast);
  } catch (error) {
    if (error instanceof SafeEvaluationError) {
      throw error;
    }
    throw new SafeEvaluationError(
      `Failed to evaluate expression: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Safely evaluate a condition expression, always returning a boolean
 */
export function safeEvaluateCondition(expression: string, context: Record<string, unknown> = {}): boolean {
  const result = safeEvaluate(expression, context);
  return Boolean(result);
}

export default { safeEvaluate, safeEvaluateCondition, SafeEvaluationError };
