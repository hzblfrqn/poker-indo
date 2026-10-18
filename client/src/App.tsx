import { useState, useEffect } from 'react';
import type { Card, GameStatePublic, PlayerPrivateState, PlayerSeat } from '@shared/types';
import { getSocket } from './utils/socket';
import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { GameTable } from './components/GameTable';
import { RulesModal } from './components/RulesModal';

// Random default nickname generator
const DEFAULT_NAMES = [
  'RoyalAce', 'ShadowKing', 'LuckyDragon', 'ClubMaster', 'SpadeBaron', 'DiamondFox', 'HeartQueen'
];

export function App() {
  const [displayName, setDisplayName] = useState<string>(() => {
    return localStorage.getItem('poker_player_name') ||
      DEFAULT_NAMES[Math.floor(Math.random() * DEFAULT_NAMES.length)];
  });

  const [myPlayerId, setMyPlayerId] = useState<string | null>(() => {
    return sessionStorage.getItem('poker_player_id') || null;
  });

  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    return sessionStorage.getItem('poker_session_token') || null;
  });

  const [publicState, setPublicState] = useState<GameStatePublic | null>(null);
  const [myHand, setMyHand] = useState<Card[]>([]);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Save display name
  const handleNameChange = (name: string) => {
    setDisplayName(name);
    localStorage.setItem('poker_player_name', name);
  };

  // Socket event subscriptions
  useEffect(() => {
    const socket = getSocket();

    socket.on('game:state_update', (newState: GameStatePublic) => {
      setPublicState(newState);
      setErrorMessage(null);
    });

    socket.on('player:private_hand', (privateState: PlayerPrivateState) => {
      setMyHand(privateState.hand);
    });

    socket.on('error:notification', (data: { message: string }) => {
      setErrorMessage(data.message);
      setTimeout(() => setErrorMessage(null), 5000);
    });

    // Check if URL has ?room=... to auto-populate or join
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && !publicState && sessionToken) {
      socket.emit(
        'room:join',
        {
          roomId: roomParam.toUpperCase(),
          displayName,
          sessionToken,
        },
        (res: any) => {
          if (res.success && res.playerId) {
            setMyPlayerId(res.playerId);
            if (res.sessionToken) {
              setSessionToken(res.sessionToken);
              sessionStorage.setItem('poker_session_token', res.sessionToken);
            }
          }
        }
      );
    }

    return () => {
      socket.off('game:state_update');
      socket.off('player:private_hand');
      socket.off('error:notification');
    };
  }, [displayName, sessionToken]);

  // Create room handler
  const handleCreateRoom = () => {
    const socket = getSocket();
    socket.emit('room:create', { displayName }, (res: any) => {
      if (res.success && res.roomId && res.playerId) {
        setMyPlayerId(res.playerId);
        sessionStorage.setItem('poker_player_id', res.playerId);
        window.history.pushState({}, '', `?room=${res.roomId}`);
      } else {
        setErrorMessage(res.error || 'Failed to create room');
      }
    });
  };

  // Join room handler
  const handleJoinRoom = (roomId: string) => {
    const socket = getSocket();
    socket.emit(
      'room:join',
      {
        roomId,
        displayName,
        sessionToken: sessionToken || undefined,
      },
      (res: any) => {
        if (res.success && res.playerId) {
          setMyPlayerId(res.playerId);
          sessionStorage.setItem('poker_player_id', res.playerId);
          if (res.sessionToken) {
            setSessionToken(res.sessionToken);
            sessionStorage.setItem('poker_session_token', res.sessionToken);
          }
          window.history.pushState({}, '', `?room=${roomId}`);
        } else {
          setErrorMessage(res.error || 'Failed to join room');
        }
      }
    );
  };

  // Add bot handler
  const handleAddBot = (seat?: PlayerSeat) => {
    const socket = getSocket();
    socket.emit('room:add_bot', { seat }, (res: any) => {
      if (!res.success && res.error) {
        setErrorMessage(res.error);
        setTimeout(() => setErrorMessage(null), 4000);
      }
    });
  };

  // Remove bot handler
  const handleRemoveBot = (seat: PlayerSeat) => {
    const socket = getSocket();
    socket.emit('room:remove_bot', { seat }, (res: any) => {
      if (!res.success && res.error) {
        setErrorMessage(res.error);
        setTimeout(() => setErrorMessage(null), 4000);
      }
    });
  };

  // Ready toggle handler
  const handleReadyToggle = (isReady: boolean) => {
    const socket = getSocket();
    socket.emit('player:ready', { isReady });
  };

  // Switch seat handler
  const handleSwitchSeat = (targetSeat: PlayerSeat) => {
    const socket = getSocket();
    socket.emit('player:switch_seat', { targetSeat });
  };

  // Start game handler
  const handleStartGame = () => {
    const socket = getSocket();
    socket.emit('game:start');
  };

  // Play cards handler
  const handlePlayCards = (cardIds: string[]) => {
    const socket = getSocket();
    socket.emit('game:play_cards', { cardIds }, (res: any) => {
      if (!res.success && res.error) {
        setErrorMessage(res.error);
        setTimeout(() => setErrorMessage(null), 4000);
      }
    });
  };

  // Pass handler
  const handlePass = () => {
    const socket = getSocket();
    socket.emit('game:pass', (res: any) => {
      if (!res.success && res.error) {
        setErrorMessage(res.error);
        setTimeout(() => setErrorMessage(null), 4000);
      }
    });
  };

  // Rematch / Play Again handler
  const handlePlayAgain = () => {
    const socket = getSocket();
    socket.emit('game:restart');
  };

  // Send Chat message handler
  const handleSendMessage = (message: string) => {
    const socket = getSocket();
    socket.emit('chat:send', { message });
  };

  // Leave room handler
  const handleLeaveRoom = () => {
    const socket = getSocket();
    socket.emit('room:leave');
    setPublicState(null);
    setMyHand([]);
    setMyPlayerId(null);
    setSessionToken(null);
    sessionStorage.removeItem('poker_player_id');
    sessionStorage.removeItem('poker_session_token');
    window.history.pushState({}, '', window.location.pathname);
  };

  // Determine current screen view
  const currentView = !publicState
    ? 'HOME'
    : publicState.status === 'LOBBY'
    ? 'LOBBY'
    : 'GAME';

  // Fallback player ID to prevent blank screen if local state was temporarily out of sync
  const effectivePlayerId =
    myPlayerId ||
    publicState?.players.find((p) => p.displayName === displayName)?.id ||
    publicState?.players[0]?.id ||
    null;

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-950 font-sans text-slate-100">
      {/* Global Error Banner */}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-red-950/90 border border-red-500 text-red-200 text-xs sm:text-sm font-semibold shadow-2xl animate-bounce">
          {errorMessage}
        </div>
      )}

      {/* Screen Routing */}
      {currentView === 'HOME' && (
        <Home
          displayName={displayName}
          onChangeDisplayName={handleNameChange}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onOpenRules={() => setRulesOpen(true)}
          errorMessage={errorMessage}
        />
      )}

      {currentView === 'LOBBY' && publicState && effectivePlayerId && (
        <div className="flex-1 flex flex-col justify-center">
          <Lobby
            roomState={publicState}
            myPlayerId={effectivePlayerId}
            onReadyToggle={handleReadyToggle}
            onSwitchSeat={handleSwitchSeat}
            onAddBot={handleAddBot}
            onRemoveBot={handleRemoveBot}
            onLeaveRoom={handleLeaveRoom}
            onStartGame={handleStartGame}
            onOpenRules={() => setRulesOpen(true)}
          />
        </div>
      )}

      {currentView === 'GAME' && publicState && effectivePlayerId && (
        <GameTable
          publicState={publicState}
          myHand={myHand}
          myPlayerId={effectivePlayerId}
          onPlayCards={handlePlayCards}
          onPass={handlePass}
          onSendMessage={handleSendMessage}
          onPlayAgain={handlePlayAgain}
          onLeaveRoom={handleLeaveRoom}
          onOpenRules={() => setRulesOpen(true)}
        />
      )}

      {/* Rules Modal */}
      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}

export default App;
