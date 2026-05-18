import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

/**
 * Custom React Hook to manage Socket.IO connectivity, connection states, 
 * and robust message deduplication.
 * 
 * @param {Function} onNewFeed - Callback triggered when a new feed card is broadcast.
 * @param {Function} onUpdateFeed - Callback triggered when a feed card is updated.
 */
export const useSocket = (onNewFeed, onUpdateFeed) => {
  const [status, setStatus] = useState('connecting'); // 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  const socketRef = useRef(null);
  const processedIdsRef = useRef(new Set()); // In-memory deduplication set

  // Keep callback references stable to prevent unnecessary socket re-registrations
  const onNewFeedRef = useRef(onNewFeed);
  const onUpdateFeedRef = useRef(onUpdateFeed);

  useEffect(() => {
    onNewFeedRef.current = onNewFeed;
    onUpdateFeedRef.current = onUpdateFeed;
  }, [onNewFeed, onUpdateFeed]);

  useEffect(() => {
    const backendUrl = 'http://localhost:5000';
    console.log(`[SOCKET] Establishing connection to ${backendUrl}...`);

    const socket = io(backendUrl, {
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`[SOCKET] Connection established successfully. ID: ${socket.id}`);
      setStatus('connected');
    });

    socket.on('disconnect', (reason) => {
      console.warn(`[SOCKET] Disconnected. Reason: ${reason}`);
      setStatus('disconnected');
      
      // If disconnected by the server explicitly, force manual reconnect
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error(`[SOCKET] Connection gateway error: ${error.message}`);
      setStatus('reconnecting');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[SOCKET] Attempting reconnection (${attemptNumber}/15)...`);
      setStatus('reconnecting');
    });

    // Custom acknowledgment on connection
    socket.on('connection:ack', (data) => {
      console.log(`[SOCKET] Received Server Ack:`, data.message);
    });

    // Listen for new coaching feed broadcast
    socket.on('feed:new', (feedItem) => {
      const msgId = feedItem.messageId;
      
      // Perform deduplication check
      if (processedIdsRef.current.has(msgId)) {
        console.warn(`[SOCKET] Duplicate event rejected. MessageId already processed: ${msgId}`);
        return;
      }

      // Track the messageId to avoid duplicates with HTTP rest polling
      processedIdsRef.current.add(msgId);

      // Keep size bounded to prevent memory leaks in extremely long sessions
      if (processedIdsRef.current.size > 1000) {
        const firstValue = processedIdsRef.current.values().next().value;
        processedIdsRef.current.delete(firstValue);
      }

      if (onNewFeedRef.current) {
        onNewFeedRef.current(feedItem);
      }
    });

    // Listen for updates (poll votes, workout toggles, goal meter increases)
    socket.on('feed:update', (updatedItem) => {
      console.log(`[SOCKET] Received Feed Card Update for ID: ${updatedItem._id}`);
      if (onUpdateFeedRef.current) {
        onUpdateFeedRef.current(updatedItem);
      }
    });

    // Graceful unmount cleanup
    return () => {
      console.log('[SOCKET] Cleaning up and disconnecting client...');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('reconnect_attempt');
      socket.off('connection:ack');
      socket.off('feed:new');
      socket.off('feed:update');
      socket.disconnect();
    };
  }, []);

  /**
   * Helper to manually seed standard rest fetched IDs into deduplication list
   */
  const registerProcessedId = (msgId) => {
    if (msgId) {
      processedIdsRef.current.add(msgId);
    }
  };

  return {
    status,
    registerProcessedId,
    socket: socketRef.current
  };
};
