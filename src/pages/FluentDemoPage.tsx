/**
 * Fluent Design Demo Page
 * Showcase all Fluent components
 */

import React, { useState } from 'react';
import { FluentLayout } from '../components/layout/FluentLayout';
import {
  FluentButton,
  FluentCard,
  FluentInput,
  FluentMessageBubble,
  FluentChatInput,
  FluentConversationList,
} from '../components/fluent';
import type { FluentConversationItem } from '../components/fluent/FluentConversationList';
import { fluentColors, fluentTypography, fluentSpacing, fluentBorderRadius } from '../styles/fluentTokens';
import { Plus, Search, Send, Download, Trash2, Edit, Star, Check } from 'lucide-react';

const FluentDemoPage: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [chatValue, setChatValue] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string>('1');

  // Demo conversations
  const conversations: FluentConversationItem[] = [
    {
      id: '1',
      title: 'Lisa AI Assistant',
      lastMessage: 'How can I help you today?',
      timestamp: new Date(),
      unreadCount: 2,
      online: true,
    },
    {
      id: '2',
      title: 'Project Discussion',
      lastMessage: 'The implementation looks great!',
      timestamp: new Date(Date.now() - 3600000),
      pinned: true,
    },
    {
      id: '3',
      title: 'Team Chat',
      lastMessage: 'Meeting at 3pm tomorrow',
      timestamp: new Date(Date.now() - 86400000),
      muted: true,
    },
  ];

  // Demo messages
  const messages = [
    {
      id: '1',
      content: 'Hello! How can I help you with the Fluent Design implementation?',
      sender: { name: 'Lisa', isUser: false },
      timestamp: new Date(Date.now() - 120000),
      status: 'read' as const,
    },
    {
      id: '2',
      content: 'I want to see all the available components and their variations.',
      sender: { name: 'You', isUser: true },
      timestamp: new Date(Date.now() - 60000),
      status: 'read' as const,
    },
    {
      id: '3',
      content: 'Sure! This demo page showcases all Fluent Design components. You can see buttons, cards, inputs, message bubbles, and more. Each component follows the Microsoft Office 365 design language.',
      sender: { name: 'Lisa', isUser: false },
      timestamp: new Date(),
      reactions: [{ emoji: '👍', count: 1, reacted: true }],
    },
  ];

  const sectionStyle: React.CSSProperties = {
    marginBottom: fluentSpacing.xxl,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: fluentTypography.sizes.title,
    fontWeight: fluentTypography.weights.semibold,
    marginBottom: fluentSpacing.l,
    color: `var(--color-text-primary, ${fluentColors.neutral.text})`,
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: fluentSpacing.l,
    marginBottom: fluentSpacing.l,
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: fluentSpacing.m,
    marginBottom: fluentSpacing.l,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: fluentTypography.sizes.caption,
    color: `var(--color-text-secondary, ${fluentColors.neutral.textSecondary})`,
    marginBottom: fluentSpacing.xs,
    display: 'block',
  };

  return (
    <FluentLayout title="Fluent Design Demo" showCommandBar={false}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: fluentSpacing.xxl }}>
          <h1 style={{
            fontSize: fluentTypography.sizes.display,
            fontWeight: fluentTypography.weights.bold,
            marginBottom: fluentSpacing.m,
            background: `linear-gradient(135deg, ${fluentColors.primary.light}, ${fluentColors.primary.hover})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Fluent Design System
          </h1>
          <p style={{
            fontSize: fluentTypography.sizes.subtitle,
            color: `var(--color-text-secondary, ${fluentColors.neutral.textSecondary})`,
            maxWidth: '600px',
          }}>
            A collection of UI components inspired by Microsoft Office 365 and Fluent Design principles.
          </p>
        </div>

        {/* Buttons Section */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Buttons</h2>

          <span style={labelStyle}>Variants</span>
          <div style={rowStyle}>
            <FluentButton variant="primary">Primary</FluentButton>
            <FluentButton variant="secondary">Secondary</FluentButton>
            <FluentButton variant="subtle">Subtle</FluentButton>
            <FluentButton variant="outline">Outline</FluentButton>
            <FluentButton variant="danger">Danger</FluentButton>
          </div>

          <span style={labelStyle}>Sizes</span>
          <div style={rowStyle}>
            <FluentButton size="small">Small</FluentButton>
            <FluentButton size="medium">Medium</FluentButton>
            <FluentButton size="large">Large</FluentButton>
          </div>

          <span style={labelStyle}>With Icons</span>
          <div style={rowStyle}>
            <FluentButton icon={<Plus size={16} />}>Add New</FluentButton>
            <FluentButton icon={<Download size={16} />} iconPosition="end">Download</FluentButton>
            <FluentButton variant="secondary" icon={<Edit size={16} />}>Edit</FluentButton>
            <FluentButton variant="danger" icon={<Trash2 size={16} />}>Delete</FluentButton>
          </div>

          <span style={labelStyle}>States</span>
          <div style={rowStyle}>
            <FluentButton loading>Loading</FluentButton>
            <FluentButton disabled>Disabled</FluentButton>
            <FluentButton fullWidth>Full Width Button</FluentButton>
          </div>
        </section>

        {/* Cards Section */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Cards</h2>

          <div style={gridStyle}>
            <FluentCard variant="elevated" header="Elevated Card">
              <p style={{ margin: 0, color: `var(--color-text-secondary)` }}>
                This card has a subtle shadow for elevation effect.
              </p>
            </FluentCard>

            <FluentCard variant="outlined" header="Outlined Card">
              <p style={{ margin: 0, color: `var(--color-text-secondary)` }}>
                This card has a border instead of shadow.
              </p>
            </FluentCard>

            <FluentCard variant="filled" header="Filled Card">
              <p style={{ margin: 0, color: `var(--color-text-secondary)` }}>
                This card has a filled background color.
              </p>
            </FluentCard>
          </div>

          <span style={labelStyle}>Interactive Cards</span>
          <div style={gridStyle}>
            <FluentCard
              variant="elevated"
              interactive
              header={<span><Star size={16} style={{ marginRight: '8px', color: fluentColors.semantic.warning }} />Featured</span>}
              footer={
                <div style={{ display: 'flex', gap: '8px' }}>
                  <FluentButton size="small" variant="subtle">Learn More</FluentButton>
                  <FluentButton size="small">Get Started</FluentButton>
                </div>
              }
            >
              <p style={{ margin: 0, color: `var(--color-text-secondary)` }}>
                Click me! Interactive cards can be clicked and have hover effects.
              </p>
            </FluentCard>

            <FluentCard variant="elevated" interactive selected>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={20} style={{ color: fluentColors.primary.light }} />
                <span>Selected Card</span>
              </div>
            </FluentCard>
          </div>
        </section>

        {/* Inputs Section */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Inputs</h2>

          <div style={gridStyle}>
            <FluentInput
              label="Underline Input"
              placeholder="Type something..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />

            <FluentInput
              variant="outlined"
              label="Outlined Input"
              placeholder="Type something..."
            />

            <FluentInput
              variant="filled"
              label="Filled Input"
              placeholder="Type something..."
            />
          </div>

          <div style={gridStyle}>
            <FluentInput
              label="With Start Icon"
              placeholder="Search..."
              startIcon={<Search size={16} />}
            />

            <FluentInput
              label="With End Icon"
              placeholder="Enter email..."
              endIcon={<Send size={16} />}
            />

            <FluentInput
              label="With Helper Text"
              placeholder="Enter password..."
              helperText="Must be at least 8 characters"
              type="password"
            />
          </div>

          <div style={gridStyle}>
            <FluentInput
              label="Error State"
              placeholder="Invalid input"
              error
              errorMessage="This field is required"
            />

            <FluentInput
              label="Disabled"
              placeholder="Cannot edit"
              disabled
            />

            <FluentInput
              label="Full Width"
              placeholder="Takes full width"
              fullWidth
            />
          </div>
        </section>

        {/* Chat Components Section */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Chat Components</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: fluentSpacing.l, minHeight: '500px' }}>
            {/* Conversation List */}
            <FluentCard variant="outlined" padding="none" style={{ height: '100%' }}>
              <FluentConversationList
                conversations={conversations}
                selectedId={selectedConversation}
                onSelect={(c) => setSelectedConversation(c.id)}
                onSearchChange={() => {}}
                searchValue=""
              />
            </FluentCard>

            {/* Chat Area */}
            <FluentCard variant="outlined" padding="none" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Messages */}
              <div style={{ flex: 1, overflow: 'auto', padding: fluentSpacing.m }}>
                {messages.map((msg) => (
                  <FluentMessageBubble
                    key={msg.id}
                    id={msg.id}
                    content={msg.content}
                    sender={msg.sender}
                    timestamp={msg.timestamp}
                    status={msg.status}
                    reactions={msg.reactions}
                    onCopy={() => navigator.clipboard.writeText(typeof msg.content === 'string' ? msg.content : '')}
                    onReply={() => console.log('Reply to', msg.id)}
                    onReact={(emoji) => console.log('React with', emoji)}
                  />
                ))}
              </div>

              {/* Input */}
              <div style={{ padding: fluentSpacing.m, borderTop: `1px solid var(--color-border)` }}>
                <FluentChatInput
                  value={chatValue}
                  onChange={setChatValue}
                  onSend={(msg) => {
                    console.log('Send:', msg);
                    setChatValue('');
                  }}
                  placeholder="Type a message..."
                  showToolbar
                />
              </div>
            </FluentCard>
          </div>
        </section>

        {/* Animation Classes */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Animations</h2>

          <p style={{ color: `var(--color-text-secondary)`, marginBottom: fluentSpacing.l }}>
            Add these CSS classes to any element for Fluent animations:
          </p>

          <div style={gridStyle}>
            <FluentCard variant="outlined">
              <code style={{
                fontFamily: fluentTypography.monoFontFamily,
                color: fluentColors.primary.light,
              }}>
                .fluent-page-enter
              </code>
              <p style={{ margin: '8px 0 0', fontSize: fluentTypography.sizes.caption, color: `var(--color-text-secondary)` }}>
                Fade in with slide up
              </p>
            </FluentCard>

            <FluentCard variant="outlined">
              <code style={{
                fontFamily: fluentTypography.monoFontFamily,
                color: fluentColors.primary.light,
              }}>
                .fluent-reveal
              </code>
              <p style={{ margin: '8px 0 0', fontSize: fluentTypography.sizes.caption, color: `var(--color-text-secondary)` }}>
                Light follows cursor on hover
              </p>
            </FluentCard>

            <FluentCard variant="outlined">
              <code style={{
                fontFamily: fluentTypography.monoFontFamily,
                color: fluentColors.primary.light,
              }}>
                .fluent-transition
              </code>
              <p style={{ margin: '8px 0 0', fontSize: fluentTypography.sizes.caption, color: `var(--color-text-secondary)` }}>
                Smooth state transitions
              </p>
            </FluentCard>

            <FluentCard variant="outlined">
              <code style={{
                fontFamily: fluentTypography.monoFontFamily,
                color: fluentColors.primary.light,
              }}>
                .fluent-stagger
              </code>
              <p style={{ margin: '8px 0 0', fontSize: fluentTypography.sizes.caption, color: `var(--color-text-secondary)` }}>
                Staggered list animations
              </p>
            </FluentCard>
          </div>
        </section>

        {/* Usage Example */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Usage</h2>

          <FluentCard variant="filled">
            <pre style={{
              margin: 0,
              fontFamily: fluentTypography.monoFontFamily,
              fontSize: fluentTypography.sizes.caption,
              overflow: 'auto',
              color: `var(--color-text-primary)`,
            }}>
{`import { FluentButton, FluentCard, FluentInput } from '@/components/fluent';
import { themeService } from '@/services/themeService';

// Switch to Fluent theme
themeService.setMode('fluentLight'); // or 'fluentDark'

// Use components
<FluentButton variant="primary" icon={<Plus />}>
  Add Item
</FluentButton>

<FluentCard variant="elevated" header="My Card">
  Content goes here
</FluentCard>

<FluentInput
  label="Email"
  placeholder="Enter your email"
  startIcon={<Mail />}
/>`}
            </pre>
          </FluentCard>
        </section>
      </div>
    </FluentLayout>
  );
};

export default FluentDemoPage;
