const SONG_LINKS = [
  // Replace/add as many as you want.
  // Right click a song in Spotify → Share → Copy Song Link.

  "https://open.spotify.com/track/003vvx7Niy0yvhvHt4a68B", // Mr. Brightside
  "https://open.spotify.com/track/0GjEhVFGZW8afUYGChu3Rr", // Dancing Queen
  "https://open.spotify.com/track/2grjqo0Frpf2okIBiifQKs", // September
  "https://open.spotify.com/track/62AuGbAkt8Ox2IrFFb8GKV", // Sweet Caroline
  "https://open.spotify.com/track/5UqCQaDshqbIk3pkhy4Pjg", // Levels
  "https://open.spotify.com/track/5UgT7w6zVZjP3oyawMzbiK?si=001f97dbae944744",
  "https://open.spotify.com/track/2zEOX5TIJ0tAGepEFyY8gM?si=bfc4a2caae19491e",
  "https://open.spotify.com/track/0vNf4xQLAwIc1zMY2N8PgZ?si=b558ba8f6eb64d9a",
  "https://open.spotify.com/track/0jzoBXYFp5HEKlSrxxLrtZ?si=f4728b92b1ee4328",
  "https://open.spotify.com/track/59WN2psjkt1tyaxjspN8fp?si=4aa7b084a73c42a6",
  "https://open.spotify.com/track/4EoJ151oQ5jY48z4RhSE96?si=3f65938b69d14220",
  "https://open.spotify.com/track/514joG57v4yKTsfQmz7stz?si=f2b5c0f00415456e",
  "https://open.spotify.com/track/7yNf9YjeO5JXUE3JEBgnYc?si=aba15db51cc14f3a",
  "https://open.spotify.com/track/6sGIMrtIzQjdzNndVxe397?si=5389382873a6431f",
  "https://open.spotify.com/track/20jbSiX29FDX4oQxBXyUEi?si=f2031c9dee5441d0",
  "https://open.spotify.com/track/5yvVYFDUpbnjcnRBgjwTzM?si=e275097157714890",
  "https://open.spotify.com/track/3Qa944OTMZkg8DHjET8JQv?si=6144566d989f466a",
  "https://open.spotify.com/track/5p7GiBZNL1afJJDUrOA6C8?si=a5426da8be244731",
  "https://open.spotify.com/track/6y6EZKfsOZ7P3ALbnUuXik?si=1747064d3daf46d4",
  "https://open.spotify.com/track/5MFqzWaYBe7Es4CHk66Iy3?si=c34e68f335aa45ce",
  "https://open.spotify.com/track/3YuaBvuZqcwN3CEAyyoaei?si=c74467750e2b4562",
  "https://open.spotify.com/track/1LuW4h5s9ZumBbMh7qhDDj?si=c7975ab5c71e4d51",
  "https://open.spotify.com/track/1BLOVHYYlH4JUHQGcpt75R?si=998e58e95c5c4f6e",
  "https://open.spotify.com/track/2ej1A2Ze6P2EOW7KfIosZR?si=88b0441769f544a4",
  "https://open.spotify.com/track/0OP1RzrglC008kj79Httv3?si=d9450c0cee0d45ad",
  "https://open.spotify.com/track/2mDYYGaGd9uXKkK2YhDA3i?si=a53dbac5ce7846a1",
  "https://open.spotify.com/track/0fZu9ojDt6XZLDg6dos2EM?si=5f606f7ff83c4687",
  "https://open.spotify.com/track/64DpBZj4IlDFzCwxTq7azl?si=38a4ab77423f4ddc",
  "https://open.spotify.com/track/6dmXZ9B5HdFAyzHeTneYBK?si=b9f121890b214c3e",
  "https://open.spotify.com/track/2zCLUq4EQi8ldF4B3AWC9W?si=0325ee2e0bbf4e32",
  "https://open.spotify.com/track/53S5ccTpGJ0RiEGDeW9tzT?si=547d2193067f4126",









];

function getSpotifyTrackId(spotifyUrl: string) {
  const match = spotifyUrl.match(/track\/([^?]+)/);
  return match?.[1] || "";
}

function getDaySeed() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

function getSongOfTheDayUrl() {
  if (SONG_LINKS.length === 0) return null;

  const index = getDaySeed() % SONG_LINKS.length;
  return SONG_LINKS[index];
}

export default function SongOfTheDay() {
  const songUrl = getSongOfTheDayUrl();
  const trackId = songUrl ? getSpotifyTrackId(songUrl) : "";

  if (!songUrl || !trackId) {
    return (
      <div
        id="song-of-the-day"
        className="rounded-[2rem] border border-[#C4963E]/35 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30"
      >
        <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-[#F3EEE6]">
          Song of the Day
        </p>

        <div className="grid gap-5 sm:grid-cols-[120px_1fr] sm:items-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-[#C4963E] text-5xl shadow-xl shadow-black/40">
            🎵
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">
              Add songs
            </h2>

            <p className="mt-2 text-sm text-red-100/60">
              Add Spotify track links to the SONG_LINKS array in SongOfTheDay.tsx.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="song-of-the-day"
      className="rounded-[2rem] border border-[#C4963E]/35 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30"
    >
      <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-[#F3EEE6]">
        Song of the Day
      </p>

      <h2 className="text-2xl font-black text-white">
        Daily Rhino League soundtrack
      </h2>

      <p className="mt-2 text-sm text-red-100/60">
        A daily pick from the league playlist. The playlist itself stays hidden.
      </p>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#C4963E]/30 bg-black/30">
        <iframe
          src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`}
          width="100%"
          height="152"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      </div>

      <a
        href={songUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex rounded-full bg-[#1DB954] px-5 py-3 font-black text-black transition hover:bg-[#1ed760]"
      >
        Open song
      </a>
    </div>
  );
}