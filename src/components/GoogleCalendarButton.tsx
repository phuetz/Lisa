import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { useState } from 'react';
import type { MouseEvent } from 'react';
import { Button, Avatar, Popover, List, ListItem, ListItemText, ListItemAvatar, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Event as EventIcon, CalendarToday, ExitToApp } from '@mui/icons-material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function GoogleCalendarButton() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const handlePopoverToggle = (e: MouseEvent<HTMLElement>) => setAnchorEl(anchorEl ? null : e.currentTarget);
  const handlePopoverClose = () => setAnchorEl(null);

  const { t } = useTranslation();
  const { isSignedIn, user, events, signIn, signOut, isLoading } = useGoogleCalendar();

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const handleSignOut = () => {
    signOut();
  };

  const upcomingEvents = events.slice(0, 3); // Show next 3 events

  if (isLoading) {
    return <Button variant="outlined" disabled>{t('loading')}</Button>;
  }

  // Not signed in yet
  if (!isSignedIn) {
    return (
      <Button
        variant="contained"
        onClick={handleSignIn}
        startIcon={<CalendarToday />}
        color="primary"
      >
        {t('connect_google_calendar')}
      </Button>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Popover open={open} anchorEl={anchorEl} onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          style: { width: '320px', padding: '16px', maxHeight: '400px', overflowY: 'auto' },
        }}
      >
        <Typography variant="subtitle1" gutterBottom>{t('upcoming_events')}</Typography>
        {upcomingEvents.length > 0 ? (
          <List dense>
            {upcomingEvents.map((event) => (
              <ListItem key={event.id}>
                <ListItemAvatar>
                  <EventIcon color="primary" />
                </ListItemAvatar>
                <ListItemText
                  primary={event.summary}
                  secondary={format(new Date(event.start.dateTime), 'PPp', { locale: fr })}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="textSecondary">
            {t('no_upcoming_events')}
          </Typography>
        )}
      </Popover>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Avatar onClick={handlePopoverToggle}
          src={user?.picture} 
          alt={user?.name}
          sx={{ width: 32, height: 32 }}
        />
        <Button
          onClick={handleSignOut}
          startIcon={<ExitToApp />}
          color="inherit"
          size="small"
        >
          {t('sign_out')}
        </Button>
      </div>
    </div>
  );
}
