/**
 * Lisa Gateway React Hook
 * Provides easy access to Gateway functionality in React components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getGateway } from './GatewayServer';
import { getSkillsManager } from './SkillsManager';
import type {
  Session,
  Channel,
  Presence,
  GatewayMessage,
  MessagePayload,
  StreamChunk,
  ChannelType,
  SessionMetadata
} from './types';
import type { Skill, SkillCategory, SkillStatus } from './SkillsManager';

interface UseGatewayOptions {
  autoConnect?: boolean;
  userId?: string;
}

interface UseGatewayReturn {
  // Connection state
  connected: boolean;
  connecting: boolean;
  error: string | null;

  // Sessions
  sessions: Session[];
  currentSession: Session | null;
  createSession: (channelType: ChannelType, metadata?: SessionMetadata) => Promise<Session>;
  closeSession: (sessionId: string) => Promise<void>;
  switchSession: (sessionId: string) => void;

  // Messages
  sendMessage: (content: string, attachments?: MessagePayload['attachments']) => Promise<void>;
  onMessage: (callback: (message: GatewayMessage<MessagePayload>) => void) => () => void;
  onStream: (callback: (chunk: StreamChunk) => void) => () => void;

  // Channels
  channels: Channel[];
  connectChannel: (type: ChannelType, config: Channel['config']) => Promise<Channel>;
  disconnectChannel: (channelId: string) => Promise<void>;

  // Presence
  presence: Map<string, Presence>;
  updatePresence: (status: Presence['status']) => void;

  // Skills
  skills: Skill[];
  enabledSkills: Skill[];
  installSkill: (skillId: string, source?: string) => Promise<Skill>;
  uninstallSkill: (skillId: string) => Promise<void>;
  enableSkill: (skillId: string) => void;
  disableSkill: (skillId: string) => void;
  listSkills: (filter?: { category?: SkillCategory; status?: SkillStatus }) => Skill[];

  // Stats
  stats: {
    sessions: number;
    channels: number;
    clients: number;
    skills: {
      total: number;
      enabled: number;
    };
  };
}

export function useGateway(options: UseGatewayOptions = {}): UseGatewayReturn {
  const { autoConnect = true, userId = 'default-user' } = options;

  const gateway = useRef(getGateway());
  const skillsManager = useRef(getSkillsManager());

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [presence, setPresence] = useState<Map<string, Presence>>(new Map());
  const [skills, setSkills] = useState<Skill[]>([]);
  const [enabledSkills, setEnabledSkills] = useState<Skill[]>([]);

  // Initialize
  useEffect(() => {
    if (autoConnect) {
      setConnecting(true);
      
      // Simulate connection (in real impl, connect WebSocket)
      setTimeout(() => {
        setConnected(true);
        setConnecting(false);
        
        // Load initial data
        setSessions(gateway.current.listSessions());
        setChannels(gateway.current.listChannels());
        setSkills(skillsManager.current.listSkills());
        setEnabledSkills(skillsManager.current.listEnabledSkills());
      }, 100);
    }

    // Set up event listeners
    const gw = gateway.current;
    const sm = skillsManager.current;

    const handleSessionCreated = (session: Session) => {
      setSessions(prev => [...prev, session]);
    };

    const handleSessionClosed = ({ sessionId }: { sessionId: string }) => {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
    };

    const handleChannelConnected = (channel: Channel) => {
      setChannels(prev => [...prev, channel]);
    };

    const handleChannelDisconnected = ({ channelId }: { channelId: string }) => {
      setChannels(prev => prev.filter(c => c.id !== channelId));
    };

    const handlePresenceChanged = (p: Presence) => {
      setPresence(prev => new Map(prev).set(p.sessionId, p));
    };

    const handleSkillInstalled = (skill: Skill) => {
      setSkills(prev => [...prev, skill]);
    };

    const handleSkillEnabled = (skill: Skill) => {
      setEnabledSkills(prev => [...prev, skill]);
    };

    const handleSkillDisabled = (skill: Skill) => {
      setEnabledSkills(prev => prev.filter(s => s.id !== skill.id));
    };

    gw.on('session:created', handleSessionCreated);
    gw.on('session:closed', handleSessionClosed);
    gw.on('channel:connected', handleChannelConnected);
    gw.on('channel:disconnected', handleChannelDisconnected);
    gw.on('presence:changed', handlePresenceChanged);
    sm.on('skill:installed', handleSkillInstalled);
    sm.on('skill:enabled', handleSkillEnabled);
    sm.on('skill:disabled', handleSkillDisabled);

    return () => {
      gw.off('session:created', handleSessionCreated);
      gw.off('session:closed', handleSessionClosed);
      gw.off('channel:connected', handleChannelConnected);
      gw.off('channel:disconnected', handleChannelDisconnected);
      gw.off('presence:changed', handlePresenceChanged);
      sm.off('skill:installed', handleSkillInstalled);
      sm.off('skill:enabled', handleSkillEnabled);
      sm.off('skill:disabled', handleSkillDisabled);
    };
  }, [autoConnect, currentSession?.id]);

  // Session management
  const createSession = useCallback(async (
    channelType: ChannelType,
    metadata?: SessionMetadata
  ): Promise<Session> => {
    const session = await gateway.current.createSession(userId, channelType, metadata);
    setCurrentSession(session);
    return session;
  }, [userId]);

  const closeSession = useCallback(async (sessionId: string): Promise<void> => {
    await gateway.current.closeSession(sessionId);
  }, []);

  const switchSession = useCallback((sessionId: string): void => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
    }
  }, [sessions]);

  // Message handling
  const sendMessage = useCallback(async (
    content: string,
    attachments?: MessagePayload['attachments']
  ): Promise<void> => {
    if (!currentSession) {
      throw new Error('No active session');
    }
    
    await gateway.current.sendMessage(currentSession.id, {
      content,
      role: 'user',
      attachments
    });
  }, [currentSession]);

  const onMessage = useCallback((
    callback: (message: GatewayMessage<MessagePayload>) => void
  ): (() => void) => {
    gateway.current.on('message:received', callback);
    return () => gateway.current.off('message:received', callback);
  }, []);

  const onStream = useCallback((
    callback: (chunk: StreamChunk) => void
  ): (() => void) => {
    const handler = (message: GatewayMessage<StreamChunk>) => {
      callback(message.payload);
    };
    gateway.current.on('message:streamed', handler);
    return () => gateway.current.off('message:streamed', handler);
  }, []);

  // Channel management
  const connectChannel = useCallback(async (
    type: ChannelType,
    config: Channel['config']
  ): Promise<Channel> => {
    return gateway.current.connectChannel(type, config);
  }, []);

  const disconnectChannel = useCallback(async (channelId: string): Promise<void> => {
    await gateway.current.disconnectChannel(channelId);
  }, []);

  // Presence
  const updatePresenceStatus = useCallback((status: Presence['status']): void => {
    if (currentSession) {
      gateway.current.updatePresence(currentSession.id, status);
    }
  }, [currentSession]);

  // Skills management
  const installSkill = useCallback(async (skillId: string, source?: string): Promise<Skill> => {
    try {
      return await skillsManager.current.installSkill(skillId, source);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install skill');
      throw err;
    }
  }, []);

  const uninstallSkill = useCallback(async (skillId: string): Promise<void> => {
    try {
      await skillsManager.current.uninstallSkill(skillId);
      setSkills(skillsManager.current.listSkills());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to uninstall skill');
      throw err;
    }
  }, []);

  const enableSkill = useCallback((skillId: string): void => {
    skillsManager.current.enableSkill(skillId);
  }, []);

  const disableSkill = useCallback((skillId: string): void => {
    skillsManager.current.disableSkill(skillId);
  }, []);

  const listSkillsFiltered = useCallback((
    filter?: { category?: SkillCategory; status?: SkillStatus }
  ): Skill[] => {
    return skillsManager.current.listSkills(filter);
  }, []);

  // Stats
  const stats = {
    sessions: sessions.length,
    channels: channels.length,
    clients: gateway.current.getStats().clients,
    skills: {
      total: skills.length,
      enabled: enabledSkills.length
    }
  };

  return {
    // Connection
    connected,
    connecting,
    error,

    // Sessions
    sessions,
    currentSession,
    createSession,
    closeSession,
    switchSession,

    // Messages
    sendMessage,
    onMessage,
    onStream,

    // Channels
    channels,
    connectChannel,
    disconnectChannel,

    // Presence
    presence,
    updatePresence: updatePresenceStatus,

    // Skills
    skills,
    enabledSkills,
    installSkill,
    uninstallSkill,
    enableSkill,
    disableSkill,
    listSkills: listSkillsFiltered,

    // Stats
    stats
  };
}

