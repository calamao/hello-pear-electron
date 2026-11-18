import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import styled, { keyframes } from 'styled-components'
import type { TicTacToeGame } from '@hello-pear/tic-tac-toe-api'

type Outcome = 'win' | 'loss'

interface GameResultAnimationProps {
  game: TicTacToeGame | null
  active: boolean
}

const winPop = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.55) rotate(-10deg);
  }

  60% {
    opacity: 1;
    transform: scale(1.12) rotate(5deg);
  }

  82% {
    transform: scale(0.96) rotate(-2deg);
  }

  100% {
    transform: scale(1) rotate(0);
  }
`

const lossWobble = keyframes`
  0% {
    opacity: 0;
    transform: translateY(-10px) rotate(0) scale(0.8);
  }

  35% {
    opacity: 1;
    transform: translateY(0) rotate(-8deg) scale(1.05);
  }

  65% {
    transform: translateY(2px) rotate(7deg);
  }

  85% {
    transform: translateY(0) rotate(-3deg);
  }

  100% {
    transform: translateY(0) rotate(0);
  }
`

const confettiDrop = keyframes`
  0% {
    top: -4vh;
    opacity: 0;
    rotate: 0deg;
  }

  12% {
    opacity: 1;
  }

  100% {
    top: 108vh;
    opacity: 0;
    rotate: 720deg;
  }
`

const ResultOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px 16px;
  pointer-events: none;
`

const ResultBanner = styled.div<{ $outcome: Outcome }>`
  position: relative;
  z-index: 1;
  max-width: min(460px, 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 18px;
  border: 1px solid ${({ $outcome }) => ($outcome === 'win' ? '#a4df52' : '#d8d6cf')};
  border-radius: 16px;
  background: ${({ $outcome }) => ($outcome === 'win' ? '#eaffc9' : '#fff')};
  color: #20201d;
  font-size: 14px;
  font-weight: 900;
  text-align: center;
  box-shadow: 0 12px 36px rgba(32, 32, 29, 0.18);
  animation: ${({ $outcome }) => ($outcome === 'win' ? winPop : lossWobble)} 850ms
    cubic-bezier(0.2, 0.8, 0.2, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const ConfettiPiece = styled.span<{ $index: number; $color: string }>`
  position: fixed;
  top: -4vh;
  left: ${({ $index }) => `${($index * 43 + 5) % 100}%`};
  width: ${({ $index }) => ($index % 3 === 0 ? '8px' : '6px')};
  height: ${({ $index }) => ($index % 3 === 0 ? '12px' : '8px')};
  border-radius: ${({ $index }) => ($index % 4 === 0 ? '50%' : '2px')};
  background: ${({ $color }) => $color};
  animation: ${confettiDrop} 1750ms ease-out ${({ $index }) => `${($index % 9) * 55}ms`} both;

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`

const ResultEmoji = styled.span`
  font-size: 26px;
  line-height: 1;
`

const confettiColors = ['#baff39', '#7c5cff', '#ff7a90', '#35b6a4', '#f2ad50']
const confettiPieces = Array.from({ length: 28 }, (_, index) => ({
  index,
  color: confettiColors[index % confettiColors.length]
}))

export function GameResultAnimation({ game, active }: GameResultAnimationProps) {
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  useEffect(() => {
    if (!active || game?.status !== 'finished' || game.isDraw) {
      setOutcome(null)
      return
    }

    setOutcome(game.winner === 'X' ? 'win' : 'loss')
    const timer = setTimeout(() => setOutcome(null), 2300)
    return () => clearTimeout(timer)
  }, [active, game?.id, game?.status, game?.updatedAt, game?.winner, game?.isDraw])

  if (!outcome) return null

  return createPortal(
    <ResultOverlay>
      {outcome === 'win' &&
        confettiPieces.map(({ index, color }) => (
          <ConfettiPiece key={index} aria-hidden='true' $index={index} $color={color} />
        ))}
      <ResultBanner role='status' aria-live='polite' $outcome={outcome}>
        <ResultEmoji aria-hidden='true'>{outcome === 'win' ? '🏆' : '🫠'}</ResultEmoji>
        <span>
          {outcome === 'win'
            ? "You win! The O's are filing a complaint."
            : "You lose! The O's are taking the victory lap."}
        </span>
      </ResultBanner>
    </ResultOverlay>,
    document.body
  )
}
