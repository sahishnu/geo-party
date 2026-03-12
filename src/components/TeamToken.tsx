import type { Team } from '../types/database'

interface Props {
  team: Team
  size?: 'sm' | 'md'
}

export default function TeamToken({ team, size = 'md' }: Props) {
  const sizeClass = size === 'sm' ? 'text-lg w-7 h-7' : 'text-2xl w-9 h-9'
  return (
    <span
      className={`${sizeClass} flex items-center justify-center rounded-full bg-black/40 border-2 border-white/30`}
      title={team.name}
    >
      {team.icon}
    </span>
  )
}
