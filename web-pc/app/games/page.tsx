import { redirect } from 'next/navigation';

/** /games 统一入口 → 默认进入 Wordling tab */
export default function GamesIndexPage() {
  redirect('/games/wordling');
}
