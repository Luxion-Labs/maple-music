/**
 * Maple API types — React port of ui/src/lib/api.ts
 * All types match the Rust backend's serialisation exactly.
 */

export type Rating = 'like' | 'dislike' | 'indifferent';
export type RepeatMode = 'off' | 'all' | 'one';

export interface ArtistRun {
  text: string;
  id?: string;
}

export interface SongItem {
  video_id: string;
  title: string;
  artists: string;
  artist_id?: string;
  artist_runs?: ArtistRun[];
  album?: string;
  album_id?: string;
  duration?: string;
  play_count?: string;
  thumbnail?: string;
  set_video_id?: string;
  rating?: Rating;
  queued_by?: string;
  queued?: boolean;
  queued_end?: boolean;
  queued_from?: string;
  autoplay?: boolean;
  explicit?: boolean;
}

export interface NowPlaying {
  videoId: string;
  title: string;
  artists: string;
  artistId?: string;
  artistRuns?: ArtistRun[];
  thumbnail?: string;
  duration?: string;
  streamClient: string;
  rating?: Rating | null;
}

export interface QueueState {
  items: SongItem[];
  currentIndex: number;
  playedFrom?: number;
  shuffle?: boolean;
  repeat?: RepeatMode;
  sourceName?: string | null;
}

export interface PlaybackSnapshot {
  now: NowPlaying | null;
  paused: boolean;
  position: number;
  duration: number;
  volume: number;
}

export interface QueueIndex {
  currentIndex: number;
  playedFrom?: number;
  shuffle?: boolean;
  repeat?: RepeatMode;
  sourceName?: string | null;
  current: SongItem | null;
}

export interface Account {
  signedIn: boolean;
  name?: string | null;
  handle?: string | null;
  email?: string | null;
  thumbnail?: string | null;
  channelId?: string | null;
  canSwitch?: boolean;
  selectionRequired?: boolean;
}

export interface AccountIdentity {
  selectionKey: string;
  name: string;
  handle?: string | null;
  email?: string | null;
  thumbnail?: string | null;
  channelId?: string | null;
  selected: boolean;
}

export interface BrowseItem {
  kind: 'song' | 'playlist' | 'album' | 'artist';
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  duration?: string;
  artistRuns?: ArtistRun[];
  playCount?: string;
  explicit?: boolean;
}

export interface HomeSection {
  title: string;
  items: BrowseItem[];
  moreBrowseId?: string;
  moreParams?: string;
}

export interface HomeChip {
  title: string;
  params: string;
}

export interface HomePage {
  chips: HomeChip[];
  sections: HomeSection[];
  continuation?: string;
}

export interface ArtistCarousel {
  title: string;
  items: BrowseItem[];
  moreBrowseId?: string;
  moreParams?: string;
}

export interface SearchResults {
  top: BrowseItem[];
  songs: BrowseItem[];
  albums: BrowseItem[];
  artists: BrowseItem[];
  playlists: BrowseItem[];
}

export interface AlbumPage {
  title?: string;
  artist?: string;
  artistId?: string;
  artistRuns?: ArtistRun[];
  artistThumbnail?: string;
  subtitle?: string;
  secondSubtitle?: string;
  description?: string;
  thumbnail?: string;
  items: SongItem[];
  continuation?: string;
  explicit?: boolean;
  playlistId?: string;
  inLibrary: boolean;
  sections?: ArtistCarousel[];
}

export interface ArtistPage {
  name?: string;
  thumbnail?: string;
  description?: string;
  subscribers?: string;
  monthlyListeners?: string;
  channelId: string;
  subscribed: boolean;
  topSongs: SongItem[];
  topSongsId?: string;
  sections: ArtistCarousel[];
}

export interface SortMenu {
  selected?: ServerSort;
  editable: boolean;
}

export type ServerSort = 'default' | 'newest' | 'oldest' | 'title' | 'artist' | 'album' | 'top';

export interface PlaylistPage {
  title?: string;
  subtitle?: string;
  thumbnail?: string;
  description?: string;
  privacy?: string;
  cover?: string;
  items: SongItem[];
  continuation?: string;
  owned: boolean;
  sortMenu?: SortMenu;
}

export interface PlaylistContinuation {
  items: SongItem[];
  continuation?: string;
}

export interface LocalLibrary {
  folders: string[];
  albums: BrowseItem[];
  artists: BrowseItem[];
  songs: SongItem[];
  removed: string[];
}

export interface LyricWord { text: string; start_ms: number; end_ms: number; }
export interface LyricLine {
  time_ms?: number;
  end_time_ms?: number;
  text: string;
  words?: LyricWord[];
  translation?: string;
}
export interface Lyrics {
  source: string;
  synced: boolean;
  instrumental: boolean;
  lines: LyricLine[];
}

export interface LastfmState { connected: boolean; username?: string | null; error?: string | null; }

export interface LtUser { user_id: string; username: string; is_host: boolean; is_connected: boolean; }
export interface LtTrack { id: string; title: string; artist: string; thumbnail?: string | null; duration_ms: number; queued_by?: string | null; }
export interface LtPendingJoin { userId: string; username: string; }
export interface LtSuggestion { id: string; from_user_id: string; from_username: string; track: LtTrack; }
export interface LtState {
  status: 'disconnected' | 'connecting' | 'connected';
  role: 'none' | 'host' | 'guest';
  requesting: boolean;
  roomCode: string | null;
  myId: string | null;
  serverUrl: string;
  users: LtUser[];
  currentTrack: LtTrack | null;
  queue: LtTrack[];
  pendingJoins: LtPendingJoin[];
  suggestions: LtSuggestion[];
}

export interface ReleaseNote { version: string; date: string; body: string; }

export const ON_REPEAT_ID = 'MAPLE_ON_REPEAT';
export const LOCAL_SONG_PREFIX = 'LOCAL:';
export const LOCAL_ALBUM_PREFIX = 'LOCALALBUM:';
export const LOCAL_ARTIST_PREFIX = 'LOCALARTIST:';

export const isLocalId = (id: string | undefined | null): boolean =>
  !!(id && (id.startsWith(LOCAL_SONG_PREFIX) || id.startsWith(LOCAL_ALBUM_PREFIX) || id.startsWith(LOCAL_ARTIST_PREFIX)));

// ---- Tauri invoke wrapper ----
async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// ---- Playback ----
export const play = (item: SongItem) => invoke<void>('play', { item });
export const playIndex = (index: number) => invoke<void>('play_index', { index });
export const removeFromQueue = (index: number) => invoke<void>('remove_from_queue', { index });
export const moveInQueue = (from: number, to: number) => invoke<void>('move_in_queue', { from, to });
export const playNext = (items: SongItem[], from?: string) => invoke<void>('play_next', { items, from });
export const addToQueue = (items: SongItem[], from?: string, continuation?: string) => invoke<void>('add_to_queue', { items, from, continuation });
export const clearQueued = () => invoke<void>('clear_queued');
export const nextTrack = () => invoke<void>('next_track');
export const prevTrack = () => invoke<void>('prev_track');
export const toggleShuffle = () => invoke<void>('toggle_shuffle');
export const setRepeat = (mode: RepeatMode) => invoke<void>('set_repeat', { mode });
export const togglePause = () => invoke<void>('toggle_pause');
export const seek = (position: number) => invoke<void>('seek', { position });
export const setVolume = (volume: number) => invoke<void>('set_volume', { volume });
export const setPlaybackParams = (speed: number, semitones: number) => invoke<void>('set_playback_params', { speed, semitones });
export const getQueue = () => invoke<QueueState>('get_queue');
export const getPlayback = () => invoke<PlaybackSnapshot>('get_playback');

// ---- Library ----
export const getLibrary = () => invoke<BrowseItem[]>('get_library');
export const getLibraryAlbums = () => invoke<BrowseItem[]>('get_library_albums');
export const getLibraryArtists = () => invoke<BrowseItem[]>('get_library_artists');
export const getLocalLibrary = () => invoke<LocalLibrary>('get_local_library');
export const addLocalFolder = (path: string) => invoke<LocalLibrary>('add_local_folder', { path });
export const removeLocalFolder = (path: string) => invoke<LocalLibrary>('remove_local_folder', { path });

// ---- Browse ----
export const getHome = (params?: string) => invoke<HomePage>('get_home', { params });
export const getHomeMore = (token: string) => invoke<HomePage>('get_home_more', { token });
export const getPlaylist = (id: string, sort?: ServerSort, desc?: boolean) => invoke<PlaylistPage>('get_playlist', { id, sort, desc });
export const getPlaylistMore = (token: string) => invoke<PlaylistContinuation>('get_playlist_more', { token });
export const getAlbum = (id: string) => invoke<AlbumPage>('get_album', { id });
export const getArtist = (id: string) => invoke<ArtistPage>('get_artist', { id });
export const getBrowseGrid = (id: string, params?: string) => invoke<HomeSection>('get_browse_grid', { id, params });
export const search = (query: string) => invoke<SongItem[]>('search', { query });
export const searchAll = (query: string) => invoke<SearchResults>('search_all', { query });
export const searchCards = (query: string, category: 'albums' | 'artists' | 'playlists') => invoke<BrowseItem[]>('search_cards', { query, category });

// ---- Playlist operations ----
export const createPlaylist = (title: string) => invoke<string>('create_playlist', { title });
export const deletePlaylist = (playlistId: string) => invoke<void>('delete_playlist', { playlistId });
export const addToPlaylist = (playlistId: string, videoId: string) => invoke<void>('add_to_playlist', { playlistId, videoId });
export const removeFromPlaylist = (playlistId: string, videoId: string, setVideoId: string) => invoke<void>('remove_from_playlist', { playlistId, videoId, setVideoId });
export const playlistIndex = () => invoke<Record<string, string[]>>('playlist_index');
export const syncPlaylistIndex = () => invoke<Record<string, string[]>>('sync_playlist_index');
export const setAlbumSaved = (playlistId: string, saved: boolean) => invoke<void>('set_album_saved', { playlistId, saved });
export const setPlaylistSort = (playlistId: string, sort: ServerSort) => invoke<void>('set_playlist_sort', { playlistId, sort });
export const editPlaylistDetails = (playlistId: string, changes: { name?: string; description?: string; public?: boolean }) => invoke<void>('edit_playlist_details', { playlistId, ...changes });
export const setPlaylistCover = (playlistId: string, path: string | null) => invoke<{ cover?: string; thumbnail?: string }>('set_playlist_cover', { playlistId, path });
export const playPlaylist = (items: SongItem[], start: number | null, sourceId?: string, sourceName?: string, shuffle?: boolean, continuation?: string) => invoke<void>('play_playlist', { items, start, sourceId, sourceName, shuffle, continuation });

// ---- Rate / subscribe ----
export const rate = (videoId: string, rating: Rating) => invoke<void>('rate', { videoId, rating });
export const subscribe = (channelId: string, subscribed: boolean) => invoke<void>('subscribe', { channelId, subscribed });

// ---- Auth ----
export const getAccount = () => invoke<Account>('get_account');
export const getAccountIdentities = () => invoke<AccountIdentity[]>('get_account_identities');
export const switchAccount = (selectionKey: string) => invoke<void>('switch_account', { selectionKey });
export const signOut = () => invoke<void>('sign_out');
export const loginWebview = (hint?: string) => invoke<void>('login_webview', hint ? { hint } : {});
/** Ask the native Android layer for the Google account the user picked from the system account
 *  chooser (Google Credential Manager). Null when unavailable (desktop, no chooser, or cancel) —
 *  callers fall back to the plain webview sign-in. */
export const googleSuggestAccount = () => invoke<string | null>('google_suggest_account');

// ---- Misc ----
export const getSettings = () => invoke<Record<string, string>>('get_settings');
export const setSetting = (key: string, value: string) => invoke<void>('set_setting', { key, value });
export const lastfmStatus = () => invoke<LastfmState>('lastfm_status');
export const lastfmConnect = () => invoke<void>('lastfm_connect');
export const lastfmDisconnect = () => invoke<void>('lastfm_disconnect');
export const onLastfmState = (cb: (s: LastfmState) => void) => listen<LastfmState>('lastfm-state', cb);
export const getStreamClients = () => invoke<string[]>('get_stream_clients');
export const clearCaches = () => invoke<void>('clear_caches');
export const allowFontFile = (path: string) => invoke<void>('allow_font_file', { path });
export const releaseNotes = () => invoke<ReleaseNote[]>('release_notes');
export const openExternal = (url: string) => invoke<void>('open_external', { url });
export const openMini = () => invoke<void>('open_mini');
export const closeMini = () => invoke<void>('close_mini');
export const startRadio = (kind: 'song' | 'artist' | 'album' | 'playlist', id: string, name?: string) => invoke<void>('start_radio', { kind, id, name });
export const getLyrics = (args: { videoId: string; title?: string; artists?: string; album?: string; duration?: number }) => invoke<Lyrics>('get_lyrics', args);
export const ltSetServerUrl = (url: string) => invoke<void>('lt_set_server_url', { url });
export const getPlayCounts = () => invoke<Record<string, number>>('play_counts');

// ---- Event listeners ----
type UnlistenFn = () => void;

async function listen<T>(event: string, cb: (payload: T) => void): Promise<UnlistenFn> {
  const { listen: tauriListen } = await import('@tauri-apps/api/event');
  const unlisten = await tauriListen<T>(event, (e) => cb(e.payload));
  return unlisten;
}

export const onNowPlaying = (cb: (n: NowPlaying) => void) => listen<NowPlaying>('now-playing', cb);
export const onQueueChanged = (cb: (q: QueueState) => void) => listen<QueueState>('queue-changed', cb);
export const onQueueIndex = (cb: (q: QueueIndex) => void) => listen<QueueIndex>('queue-index', cb);
export const onPosition = (cb: (p: number) => void) => listen<number>('position', cb);
export const onDuration = (cb: (d: number) => void) => listen<number>('duration', cb);
export const onVolume = (cb: (v: number) => void) => listen<number>('volume', cb);
export const onPlaybackState = (cb: (s: 'playing' | 'paused') => void) => listen<'playing' | 'paused'>('playback-state', cb);
export const onPlaybackError = (cb: (msg: string) => void) => listen<string>('playback-error', cb);
export const onPlaybackNotice = (cb: (msg: string) => void) => listen<string>('playback-notice', cb);
export const onCoverError = (cb: (msg: string) => void) => listen<string>('cover-error', cb);
export const onAuthChanged = (cb: (a: Account) => void) => listen<Account>('auth-changed', cb);
export const onLocalChanged = (cb: (removed: string[]) => void) => listen<string[]>('local-changed', cb);
export const onLoginError = (cb: (msg: string) => void) => listen<string>('login-error', cb);
export const onLoginDone = (cb: () => void) => listen<void>('login-done', () => cb());
export const onLtState = (cb: (s: LtState) => void) => listen<LtState>('lt-state', cb);

// ---- Listen Together ----
export const ltGetState = () => invoke<LtState>('lt_get_state');
export const ltCreateRoom = (username: string) => invoke<void>('lt_create_room', { username });
export const ltJoinRoom = (code: string, username: string) => invoke<void>('lt_join_room', { code, username });
export const ltLeave = () => invoke<void>('lt_leave');
export const ltApproveJoin = (userId: string) => invoke<void>('lt_approve_join', { userId });
export const ltRejectJoin = (userId: string) => invoke<void>('lt_reject_join', { userId });
export const ltKick = (userId: string) => invoke<void>('lt_kick', { userId });
export const ltTransferHost = (userId: string) => invoke<void>('lt_transfer_host', { userId });
export const ltApproveSuggestion = (id: string) => invoke<void>('lt_approve_suggestion', { id });
export const ltRejectSuggestion = (id: string) => invoke<void>('lt_reject_suggestion', { id });
export const ltRequestSync = () => invoke<void>('lt_request_sync');

// ---- Discord Rich Presence (Android only - desktop uses local IPC) ----
/** Connect to Discord Gateway with a user or bot token (Android only). */
export const discordConnect = (token: string) => invoke<string>('discord_connect', { token });

/** Update Discord activity/presence (Android only). */
export const discordUpdateActivity = (
  appName: string,
  applicationId: string,
  details: string,
  state: string,
  thumbnail?: string
) =>
  invoke<void>('discord_update_activity', {
    appName,
    applicationId,
    details,
    state,
    thumbnail,
  });

/** Disconnect from Discord (Android only). */
export const discordDisconnect = () => invoke<void>('discord_disconnect');

export { isTauri };
