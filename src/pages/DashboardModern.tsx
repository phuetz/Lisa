/**
 * Modern Dashboard Page
 * 
 * Page dashboard avec le nouveau design système
 */

import React from 'react';
import {
  Zap,
  TrendingUp,
  Activity,
  MoreVertical,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { ModernLayout } from '@/components/layout/ModernLayout';
import {
  ModernCard,
  ModernCardHeader,
  ModernCardBody,
  ModernCardFooter,
  StatCard,
  FeatureCard,
} from '@/components/ui/ModernCard';
import { ModernButton, IconButton, FloatingActionButton } from '@/components/ui/ModernButton';

/**
 * Page Dashboard Moderne
 */
export const DashboardModern: React.FC = () => {
  // Sample data
  const stats = [
    { label: 'Total Agents', value: 47, change: 12, icon: '🤖', color: 'blue' as const },
    { label: 'Active Tasks', value: 234, change: -5, icon: '📋', color: 'purple' as const },
    { label: 'Success Rate', value: '98%', change: 2, icon: '✅', color: 'green' as const },
    { label: 'Errors', value: 3, change: -1, icon: '⚠️', color: 'red' as const },
  ];

  const recentActivities = [
    {
      id: 1,
      agent: 'Vision Agent',
      action: 'Analyzed image',
      time: '2 minutes ago',
      status: 'success',
    },
    {
      id: 2,
      agent: 'Audio Agent',
      action: 'Processed audio',
      time: '5 minutes ago',
      status: 'success',
    },
    {
      id: 3,
      agent: 'System Integration',
      action: 'Sync failed',
      time: '10 minutes ago',
      status: 'error',
    },
    {
      id: 4,
      agent: 'Workflow Manager',
      action: 'Executed workflow',
      time: '15 minutes ago',
      status: 'success',
    },
  ];

  const quickActions = [
    {
      icon: '🤖',
      title: 'Create Agent',
      description: 'Create a new AI agent',
    },
    {
      icon: '⚙️',
      title: 'Settings',
      description: 'Configure system settings',
    },
    {
      icon: '📊',
      title: 'Analytics',
      description: 'View detailed analytics',
    },
    {
      icon: '🔔',
      title: 'Notifications',
      description: 'Manage notifications',
    },
  ];

  const topAgents = [
    {
      id: 1,
      name: 'Vision Agent',
      type: 'Computer Vision',
      status: 'active',
      tasks: 234,
      accuracy: '98%',
    },
    {
      id: 2,
      name: 'Audio Agent',
      type: 'Speech Recognition',
      status: 'active',
      tasks: 156,
      accuracy: '96%',
    },
    {
      id: 3,
      name: 'NLP Agent',
      type: 'Natural Language',
      status: 'active',
      tasks: 89,
      accuracy: '99%',
    },
  ];

  return (
    <ModernLayout title="Dashboard">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            icon={stat.icon}
            color={stat.color}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Activity */}
        <ModernCard className="lg:col-span-2">
          <ModernCardHeader
            title="Recent Activity"
            subtitle="Last 24 hours"
            icon={<Activity size={20} />}
            action={
              <ModernButton variant="ghost" size="sm">
                View All
                <ArrowRight size={16} />
              </ModernButton>
            }
          />
          <ModernCardBody>
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{activity.agent}</p>
                    <p className="text-xs text-slate-400">{activity.action}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{activity.time}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        activity.status === 'success'
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {activity.status === 'success' ? '✓' : '✕'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ModernCardBody>
        </ModernCard>

        {/* Quick Actions */}
        <ModernCard>
          <ModernCardHeader
            title="Quick Actions"
            icon={<Zap size={20} />}
          />
          <ModernCardBody className="space-y-3">
            {quickActions.map((action, index) => (
              <FeatureCard
                key={index}
                icon={action.icon}
                title={action.title}
                description={action.description}
              />
            ))}
          </ModernCardBody>
        </ModernCard>
      </div>

      {/* Top Agents */}
      <ModernCard>
        <ModernCardHeader
          title="Top Agents"
          subtitle="Performance overview"
          icon={<TrendingUp size={20} />}
          action={
            <ModernButton variant="primary" size="sm" icon={<Plus size={16} />}>
              New Agent
            </ModernButton>
          }
        />
        <ModernCardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">
                    Agent
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">
                    Tasks
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">
                    Accuracy
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {topAgents.map((agent) => (
                  <tr
                    key={agent.id}
                    className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-white font-medium">{agent.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{agent.type}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
                        {agent.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{agent.tasks}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{agent.accuracy}</td>
                    <td className="px-4 py-3 text-sm">
                      <IconButton icon={<MoreVertical size={16} />} variant="secondary" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModernCardBody>
        <ModernCardFooter>
          <ModernButton variant="ghost" size="sm">
            View All Agents
            <ArrowRight size={16} />
          </ModernButton>
        </ModernCardFooter>
      </ModernCard>

      {/* Floating Action Button */}
      <FloatingActionButton icon={<Plus size={24} />} label="Create New" />
    </ModernLayout>
  );
};

export default DashboardModern;
