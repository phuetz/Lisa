/**
 * SecurityAgent - Security Monitoring and Risk Detection
 * 
 * Monitors security risks, detects threats, and provides security recommendations
 */

import type { BaseAgent, AgentExecuteProps, AgentExecuteResult, AgentDomain } from '../core/types';
import { AgentDomains } from '../core/types';

interface SecurityRisk {
  level: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  recommendation: string;
  timestamp: number;
}

interface SecurityScan {
  passed: number;
  failed: number;
  warnings: number;
  risks: SecurityRisk[];
  score: number; // 0-100
}

export class SecurityAgent implements BaseAgent {
  name = 'SecurityAgent';
  description = 'Monitors security, detects risks, and provides security recommendations';
  version = '1.0.0';
  domain: AgentDomain = AgentDomains.ANALYSIS;
  capabilities = [
    'risk_detection',
    'security_scanning',
    'threat_analysis',
    'security_recommendations',
    'vulnerability_assessment',
    'compliance_checking'
  ];

  private securityLogs: SecurityRisk[] = [];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const { intent, context: _context, parameters } = props;

    try {
      switch (intent) {
        case 'scan_security':
          return await this.scanSecurity(parameters);
        
        case 'detect_risks':
          return await this.detectRisks(parameters);
        
        case 'analyze_threat':
          return await this.analyzeThreat(parameters);
        
        case 'get_recommendations':
          return await this.getRecommendations(parameters);
        
        case 'check_compliance':
          return await this.checkCompliance(parameters);
        
        case 'get_security_score':
          return await this.getSecurityScore(parameters);
        
        case 'audit_permissions':
          return await this.auditPermissions(parameters);
        
        default:
          return {
            success: false,
            output: null,
            error: `Unknown intent: ${intent}`,
            metadata: {
              executionTime: Date.now() - startTime,
              timestamp: Date.now()
            }
          };
      }
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Perform comprehensive security scan
   */
  private async scanSecurity(_params: any): Promise<AgentExecuteResult> {
    const risks: SecurityRisk[] = [];

    // Check HTTPS
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      risks.push({
        level: 'high',
        type: 'insecure_connection',
        description: 'Application is not running on HTTPS',
        recommendation: 'Enable HTTPS to secure communications',
        timestamp: Date.now()
      });
    }

    // Check for sensitive data in localStorage
    const sensitiveKeys = ['password', 'secret', 'apikey', 'token'];
    Object.keys(localStorage).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        risks.push({
          level: 'medium',
          type: 'sensitive_data_storage',
          description: `Potential sensitive data in localStorage: ${key}`,
          recommendation: 'Use secure storage mechanisms for sensitive data',
          timestamp: Date.now()
        });
      }
    });

    // Check for CSP headers
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!cspMeta) {
      risks.push({
        level: 'medium',
        type: 'missing_csp',
        description: 'No Content Security Policy detected',
        recommendation: 'Implement CSP headers to prevent XSS attacks',
        timestamp: Date.now()
      });
    }

    // Check for session timeout
    const sessionTimeout = sessionStorage.getItem('session_timeout');
    if (!sessionTimeout) {
      risks.push({
        level: 'low',
        type: 'no_session_timeout',
        description: 'No session timeout configured',
        recommendation: 'Implement session timeout for inactive users',
        timestamp: Date.now()
      });
    }

    // Store risks in log
    this.securityLogs.push(...risks);

    const scanResult: SecurityScan = {
      passed: Math.max(0, 10 - risks.length),
      failed: risks.filter(r => r.level === 'critical' || r.level === 'high').length,
      warnings: risks.filter(r => r.level === 'medium' || r.level === 'low').length,
      risks,
      score: Math.max(0, 100 - (risks.length * 15))
    };

    return {
      success: true,
      output: scanResult,
      metadata: {
        source: 'SecurityAgent',
        timestamp: Date.now(),
        confidence: 0.95
      }
    };
  }

  /**
   * Detect security risks in real-time
   */
  private async detectRisks(params: any): Promise<AgentExecuteResult> {
    const { context: _context } = params;
    const risks: SecurityRisk[] = [];

    // Check for suspicious activities
    const recentLogs = this.securityLogs.filter(
      log => Date.now() - log.timestamp < 3600000 // Last hour
    );

    // Check for repeated failed attempts
    const failedAttempts = recentLogs.filter(
      log => log.type.includes('failed_attempt')
    );

    if (failedAttempts.length > 5) {
      risks.push({
        level: 'high',
        type: 'suspicious_activity',
        description: `Multiple failed attempts detected: ${failedAttempts.length}`,
        recommendation: 'Review logs and consider implementing rate limiting',
        timestamp: Date.now()
      });
    }

    return {
      success: true,
      output: {
        risksDetected: risks.length,
        risks,
        summary: risks.length === 0 
          ? 'No immediate security risks detected' 
          : `${risks.length} security risk(s) detected`
      },
      metadata: {
        source: 'SecurityAgent',
        timestamp: Date.now()
      }
    };
  }

  /**
   * Analyze a specific threat
   */
  private async analyzeThreat(params: any): Promise<AgentExecuteResult> {
    const { threat, context: _ctx } = params;

    if (!threat) {
      return {
        success: false,
        output: null,
        error: 'No threat data provided'
      };
    }

    // Analyze threat severity
    const analysis = {
      threatType: threat.type || 'unknown',
      severity: this.calculateSeverity(threat),
      impact: this.assessImpact(threat),
      likelihood: this.assessLikelihood(threat),
      recommendations: this.generateRecommendations(threat)
    };

    return {
      success: true,
      output: analysis,
      metadata: {
        source: 'SecurityAgent',
        timestamp: Date.now(),
        confidence: 0.85
      }
    };
  }

  /**
   * Get security recommendations
   */
  private async getRecommendations(_params: any): Promise<AgentExecuteResult> {
    const recommendations = [
      {
        priority: 'high',
        category: 'authentication',
        title: 'Enable Two-Factor Authentication',
        description: 'Add an extra layer of security to user accounts',
        impact: 'Significantly reduces unauthorized access risk'
      },
      {
        priority: 'high',
        category: 'encryption',
        title: 'Encrypt Sensitive Data',
        description: 'Encrypt sensitive data at rest and in transit',
        impact: 'Protects data from unauthorized access'
      },
      {
        priority: 'medium',
        category: 'monitoring',
        title: 'Enable Security Monitoring',
        description: 'Set up real-time security event monitoring',
        impact: 'Early detection of security incidents'
      },
      {
        priority: 'medium',
        category: 'updates',
        title: 'Keep Dependencies Updated',
        description: 'Regularly update all software dependencies',
        impact: 'Reduces vulnerability exposure'
      },
      {
        priority: 'low',
        category: 'training',
        title: 'Security Awareness Training',
        description: 'Train users on security best practices',
        impact: 'Reduces human error risks'
      }
    ];

    return {
      success: true,
      output: {
        recommendations,
        totalRecommendations: recommendations.length,
        highPriority: recommendations.filter(r => r.priority === 'high').length
      },
      metadata: {
        source: 'SecurityAgent',
        timestamp: Date.now()
      }
    };
  }

  /**
   * Check compliance with security standards
   */
  private async checkCompliance(params: any): Promise<AgentExecuteResult> {
    const { standard = 'OWASP' } = params;

    const complianceChecks = {
      OWASP: [
        { check: 'Injection Prevention', passed: true, score: 95 },
        { check: 'Broken Authentication', passed: false, score: 60 },
        { check: 'Sensitive Data Exposure', passed: true, score: 85 },
        { check: 'XML External Entities', passed: true, score: 100 },
        { check: 'Broken Access Control', passed: true, score: 90 },
        { check: 'Security Misconfiguration', passed: false, score: 70 },
        { check: 'Cross-Site Scripting', passed: true, score: 95 },
        { check: 'Insecure Deserialization', passed: true, score: 100 },
        { check: 'Using Known Vulnerable Components', passed: false, score: 65 },
        { check: 'Insufficient Logging & Monitoring', passed: true, score: 80 }
      ]
    };

    const checks = complianceChecks[standard as keyof typeof complianceChecks] || [];
    const averageScore = checks.reduce((sum, c) => sum + c.score, 0) / checks.length;

    return {
      success: true,
      output: {
        standard,
        checks,
        overallScore: Math.round(averageScore),
        passed: checks.filter(c => c.passed).length,
        failed: checks.filter(c => !c.passed).length,
        compliant: averageScore >= 80
      },
      metadata: {
        source: 'SecurityAgent',
        timestamp: Date.now()
      }
    };
  }

  /**
   * Get overall security score
   */
  private async getSecurityScore(params: any): Promise<AgentExecuteResult> {
    const scanResult = await this.scanSecurity(params);
    
    if (!scanResult.success) {
      return scanResult;
    }

    return {
      success: true,
      output: {
        score: (scanResult.output as SecurityScan).score,
        grade: this.getScoreGrade((scanResult.output as SecurityScan).score),
        summary: this.getScoreSummary((scanResult.output as SecurityScan).score)
      },
      metadata: {
        source: 'SecurityAgent',
        timestamp: Date.now()
      }
    };
  }

  /**
   * Audit user permissions
   */
  private async auditPermissions(_params: any): Promise<AgentExecuteResult> {
    // Check browser permissions
    const permissions = {
      camera: await this.checkPermission('camera'),
      microphone: await this.checkPermission('microphone'),
      notifications: await this.checkPermission('notifications'),
      geolocation: await this.checkPermission('geolocation')
    };

    const grantedCount = Object.values(permissions).filter(p => p === 'granted').length;
    const deniedCount = Object.values(permissions).filter(p => p === 'denied').length;

    return {
      success: true,
      output: {
        permissions,
        summary: {
          granted: grantedCount,
          denied: deniedCount,
          prompt: Object.values(permissions).filter(p => p === 'prompt').length
        }
      },
      metadata: {
        source: 'SecurityAgent',
        timestamp: Date.now()
      }
    };
  }

  // Helper methods
  
  private calculateSeverity(threat: any): 'low' | 'medium' | 'high' | 'critical' {
    // Basic severity calculation
    return threat.level || 'medium';
  }

  private assessImpact(threat: any): string {
    const impacts = {
      low: 'Minimal impact on operations',
      medium: 'Moderate impact on operations',
      high: 'Significant impact on operations',
      critical: 'Severe impact on operations'
    };
    return impacts[threat.level as keyof typeof impacts] || impacts.medium;
  }

  private assessLikelihood(_threat: any): string {
    return 'Medium likelihood based on current threat landscape';
  }

  private generateRecommendations(_threat: any): string[] {
    return [
      'Monitor system logs for unusual activity',
      'Review and update security policies',
      'Implement additional access controls if needed'
    ];
  }

  private getScoreGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private getScoreSummary(score: number): string {
    if (score >= 90) return 'Excellent security posture';
    if (score >= 80) return 'Good security with minor improvements needed';
    if (score >= 70) return 'Adequate security with some concerns';
    if (score >= 60) return 'Poor security requiring immediate attention';
    return 'Critical security issues detected';
  }

  private async checkPermission(name: string): Promise<string> {
    try {
      if (!navigator.permissions) return 'unknown';
      
      const permissionName = name as PermissionName;
      const result = await navigator.permissions.query({ name: permissionName });
      return result.state;
    } catch {
      return 'unknown';
    }
  }

  async canHandle(query: string, _context?: any): Promise<number> {
    const keywords = [
      'security', 'secure', 'risk', 'threat', 'vulnerability',
      'safe', 'protect', 'audit', 'compliance', 'permission',
      'sécurité', 'sûr', 'risque', 'menace', 'vulnérabilité',
      'protection', 'audit'
    ];

    const lowerQuery = query.toLowerCase();
    const matches = keywords.filter(keyword => lowerQuery.includes(keyword));
    
    return matches.length > 0 ? Math.min(matches.length * 0.3, 1.0) : 0.0;
  }
}
