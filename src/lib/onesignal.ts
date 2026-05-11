import OneSignal from 'react-onesignal';

export const initOneSignal = async () => {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  
  if (!appId) {
    console.warn("OneSignal App ID not found in environment variables.");
    return;
  }

  try {
    await OneSignal.init({
      appId: appId,
      allowLocalhostAsSecureOrigin: true,
      notifyButton: {
        enable: true,
        prenotify: true,
        showCredit: false,
        text: {
          'tip.state.unsubscribed': 'Subscribe to notifications',
          'tip.state.subscribed': "You're subscribed to notifications",
          'tip.state.blocked': "You've blocked notifications",
          'message.prenotify': 'Click to subscribe to notifications',
          'message.action.subscribed': "Thanks for subscribing!",
          'message.action.subscribing': "Subscribing...",
          'message.action.resubscribed': "You're subscribed to notifications",
          'message.action.unsubscribed': "You won't receive notifications again",
          'dialog.main.title': 'Manage Site Notifications',
          'dialog.main.button.subscribe': 'SUBSCRIBE',
          'dialog.main.button.unsubscribe': 'UNSUBSCRIBE',
          'dialog.blocked.title': 'Unblock Notifications',
          'dialog.blocked.message': "Follow these instructions to allow notifications:"
        }
      },
    });
    console.log("OneSignal initialized successfully");
  } catch (err) {
    console.warn("OneSignal initialization non-critical failure, continuing...", err);
  }
};
