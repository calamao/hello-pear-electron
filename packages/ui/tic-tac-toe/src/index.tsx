import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import styled, { css } from 'styled-components'
import {
  createInMemoryTicTacToeApi,
  type GameStatus,
  type TicTacToeApi,
  type TicTacToeGame
} from '@hello-pear/tic-tac-toe-api'

type Filter = 'all' | 'active' | 'finished'
export type AppView = 'games' | 'worker-ping' | 'updates-test' | 'notes'

const Shell = styled.main`
  min-height: 100vh;
  background: #f4f3ef;
  color: #20201d;
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);

  @media (max-width: 820px) {
    grid-template-columns: 82px minmax(0, 1fr);
  }

  @media (max-width: 620px) {
    display: block;
  }
`

const Sidebar = styled.aside`
  position: sticky;
  top: 0;
  height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 30px 22px 22px;
  background: #20201d;
  color: #fff;

  @media (max-width: 620px) {
    position: relative;
    height: 72px;
    flex-direction: row;
    align-items: center;
    padding: 12px 16px;
  }
`

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 38px;

  @media (max-width: 820px) {
    justify-content: center;
  }

  @media (max-width: 620px) {
    margin: 0;
  }
`

const BrandMark = styled.div`
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: 13px;
  background: #baff39;
  color: #20201d;
  display: grid;
  place-items: center;
  font-family: Georgia, serif;
  font-size: 25px;
  font-weight: 800;
  transform: rotate(-3deg);
`

const BrandName = styled.span`
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 20px;
  font-weight: 700;

  @media (max-width: 820px) {
    display: none;
  }

  @media (max-width: 620px) {
    display: inline;
  }
`

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 7px;

  @media (max-width: 620px) {
    margin-left: auto;
    flex-direction: row;
  }
`

const NavButton = styled.button<{ $active?: boolean }>`
  border: 0;
  border-radius: 12px;
  background: ${({ $active }) => ($active ? '#343431' : 'transparent')};
  color: ${({ $active }) => ($active ? '#fff' : '#aaa9a3')};
  height: 46px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 11px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  text-align: left;

  &:hover {
    color: #fff;
    background: #343431;
  }

  @media (max-width: 820px) {
    justify-content: center;
    padding: 0;

    span {
      display: none;
    }
  }

  @media (max-width: 620px) {
    width: 42px;

    &:nth-child(n + 4) {
      display: none;
    }
  }
`

const NavIcon = styled.span`
  width: 20px;
  text-align: center;
  font-size: 17px;
`

const Profile = styled.div`
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  border-top: 1px solid #393936;
  padding-top: 18px;

  @media (max-width: 820px) {
    justify-content: center;
  }

  @media (max-width: 620px) {
    display: none;
  }
`

const Avatar = styled.div<{ $color: string }>`
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  color: #20201d;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 900;
`

const ProfileText = styled.div`
  min-width: 0;

  strong,
  span {
    display: block;
  }

  strong {
    font-size: 13px;
  }

  span {
    color: #aaa9a3;
    font-size: 11px;
    margin-top: 2px;
  }

  @media (max-width: 820px) {
    display: none;
  }
`

const Main = styled.section`
  min-width: 0;
  padding: 40px clamp(24px, 5vw, 72px) 64px;

  @media (max-width: 620px) {
    padding: 24px 16px 48px;
  }
`

const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 32px;
`

const Eyebrow = styled.p`
  margin: 0 0 7px;
  color: #77766f;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
`

const Title = styled.h1`
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(36px, 5vw, 58px);
  line-height: 0.95;
  letter-spacing: -0.045em;
`

const PrimaryButton = styled.button`
  border: 0;
  border-radius: 14px;
  background: #20201d;
  color: #fff;
  height: 50px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(32, 32, 29, 0.12);

  &:hover {
    background: #30302c;
    transform: translateY(-1px);
  }

  @media (max-width: 620px) {
    width: 50px;
    padding: 0;

    span {
      display: none;
    }
  }
`

const Plus = styled.span`
  font-size: 24px;
  line-height: 1;
  font-weight: 400;
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
`

const Tabs = styled.div`
  display: flex;
  gap: 6px;
  padding: 4px;
  border: 1px solid #deddd7;
  border-radius: 12px;
  background: #ebeae5;
`

const Tab = styled.button<{ $active: boolean }>`
  border: 0;
  border-radius: 9px;
  background: ${({ $active }) => ($active ? '#fff' : 'transparent')};
  color: ${({ $active }) => ($active ? '#20201d' : '#77766f')};
  padding: 8px 12px;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: ${({ $active }) => ($active ? '0 2px 8px rgba(32,32,29,.08)' : 'none')};
`

const Count = styled.span`
  color: #77766f;
  font-size: 12px;
  font-weight: 800;

  @media (max-width: 620px) {
    display: none;
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(210px, 1fr));
  gap: 16px;

  @media (max-width: 1120px) {
    grid-template-columns: repeat(2, minmax(220px, 1fr));
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`

const Card = styled.article<{ $finished?: boolean }>`
  min-height: 244px;
  box-sizing: border-box;
  border: 1px solid #dfded8;
  border-radius: 18px;
  background: ${({ $finished }) => ($finished ? '#efeee9' : '#fff')};
  padding: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 30px rgba(32, 32, 29, 0.04);
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 34px rgba(32, 32, 29, 0.09);
  }
`

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`

const GameTitle = styled.h2`
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 19px;
`

const StatusPill = styled.span<{ $status: GameStatus }>`
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 7px 9px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  ${({ $status }) => {
    if ($status === 'my-turn') {
      return css`
        background: #d9f7a3;
        color: #356000;
      `
    }
    if ($status === 'their-turn') {
      return css`
        background: #e7e4dc;
        color: #77766f;
      `
    }
    if ($status === 'invited') {
      return css`
        background: #ffe4aa;
        color: #7b5400;
      `
    }
    if ($status === 'finished') {
      return css`
        background: #20201d;
        color: #fff;
      `
    }
    return css`
      background: #ede8ff;
      color: #6247b8;
    `
  }}
`

const Players = styled.div`
  display: flex;
  align-items: center;
  margin: 20px 0 14px;
`

const PlayerAvatar = styled(Avatar)`
  width: 34px;
  height: 34px;
  flex-basis: 34px;
  border: 3px solid #fff;
  box-sizing: border-box;
`

const AvatarWithOffset = styled(PlayerAvatar)`
  margin-left: -7px;
`

const Versus = styled.span`
  margin-left: 9px;
  color: #77766f;
  font-size: 12px;
  font-weight: 700;
`

const MiniBoard = styled.div`
  width: 116px;
  height: 116px;
  margin: auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
`

const MiniSquare = styled.div`
  border-radius: 7px;
  background: #f1f0eb;
  display: grid;
  place-items: center;
  color: #20201d;
  font-family: Georgia, serif;
  font-size: 21px;
  font-weight: 800;

  &[data-mark='O'] {
    color: #e95e79;
  }
`

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #ebeae5;
`

const Updated = styled.span`
  color: #96958e;
  font-size: 11px;
`

const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`

const IconButton = styled.button`
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #77766f;
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 15px;

  &:hover {
    background: #efeee9;
    color: #20201d;
  }
`

const TextButton = styled.button`
  height: 34px;
  border: 0;
  border-radius: 9px;
  background: #20201d;
  color: #fff;
  padding: 0 11px;
  font: inherit;
  font-size: 11px;
  font-weight: 900;
  cursor: pointer;
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgba(32, 32, 29, 0.38);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  padding: 20px;
`

const Modal = styled.div`
  width: min(440px, 100%);
  box-sizing: border-box;
  border-radius: 22px;
  background: #fff;
  padding: 24px;
  box-shadow: 0 24px 80px rgba(32, 32, 29, 0.22);
`

const ModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`

const ModalTitle = styled.h2`
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 28px;
`

const Form = styled.form`
  display: grid;
  gap: 12px;
  margin-top: 22px;
`

const Label = styled.label`
  color: #77766f;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const Input = styled.input`
  width: 100%;
  height: 48px;
  box-sizing: border-box;
  border: 1px solid #dcdad3;
  border-radius: 12px;
  background: #f7f6f2;
  color: #20201d;
  padding: 0 14px;
  font: inherit;
  outline: none;

  &:focus {
    border-color: #7c5cff;
    box-shadow: 0 0 0 3px rgba(124, 92, 255, 0.12);
  }
`

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
`

const SecondaryButton = styled.button`
  height: 44px;
  border: 1px solid #ddddd6;
  border-radius: 11px;
  background: #fff;
  color: #20201d;
  padding: 0 14px;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
`

const BoardModal = styled(Modal)`
  width: min(520px, 100%);
`

const LargeBoard = styled.div`
  width: min(330px, 100%);
  aspect-ratio: 1;
  margin: 24px auto 8px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`

const LargeSquare = styled.button`
  border: 0;
  border-radius: 15px;
  background: #efeee9;
  color: #20201d;
  display: grid;
  place-items: center;
  font-family: Georgia, serif;
  font-size: clamp(38px, 9vw, 62px);
  font-weight: 800;
  cursor: pointer;

  &[data-mark='O'] {
    color: #e95e79;
  }

  &:hover:not(:disabled) {
    background: #deddd7;
  }

  &:disabled {
    cursor: default;
  }
`

const BoardStatus = styled.p`
  min-height: 20px;
  margin: 14px 0 0;
  color: #77766f;
  text-align: center;
  font-size: 13px;
  font-weight: 800;
`

function statusLabel(game: TicTacToeGame) {
  if (game.status === 'my-turn') return 'My turn'
  if (game.status === 'their-turn') return 'Their turn'
  if (game.status === 'invited') return 'Invited'
  if (game.status === 'finished') {
    return game.isDraw ? 'Draw' : game.winner === 'X' ? 'You won' : 'Finished'
  }
  return 'New game'
}

export interface TicTacToeAppProps {
  api?: TicTacToeApi
  activeView?: AppView
  onNavigate?: (view: AppView) => void
  workerPingTest?: ReactNode
  workerUpdatesTest?: ReactNode
  notesView?: ReactNode
}

export default function TicTacToeApp({
  api,
  activeView = 'games',
  onNavigate,
  workerPingTest,
  workerUpdatesTest,
  notesView
}: TicTacToeAppProps) {
  const [gameApi] = useState<TicTacToeApi>(() => api ?? createInMemoryTicTacToeApi())
  const [games, setGames] = useState<TicTacToeGame[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [boardOpen, setBoardOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<TicTacToeGame | null>(null)
  const [gameName, setGameName] = useState('')
  const [friendName, setFriendName] = useState('')

  useEffect(() => {
    void gameApi.list().then(setGames)
  }, [gameApi])

  const visibleGames = games.filter((game) => {
    if (filter === 'active') return game.status !== 'finished'
    if (filter === 'finished') return game.status === 'finished'
    return true
  })

  async function refresh() {
    setGames(await gameApi.list())
  }

  async function createGame(event: FormEvent) {
    event.preventDefault()
    await gameApi.create({ title: gameName })
    setGameName('')
    setCreateOpen(false)
    await refresh()
  }

  async function deleteGame(gameId: string) {
    await gameApi.delete(gameId)
    await refresh()
  }

  async function inviteFriend(event: FormEvent) {
    event.preventDefault()
    if (!selectedGame) return
    const updated = await gameApi.invite(selectedGame.id, friendName)
    setSelectedGame(updated)
    setFriendName('')
    setInviteOpen(false)
    await refresh()
  }

  async function playMove(index: number) {
    if (!selectedGame) return
    const updated = await gameApi.makeMove(selectedGame.id, index)
    setSelectedGame(updated)
    await refresh()
  }

  function openBoard(game: TicTacToeGame) {
    setSelectedGame(game)
    setBoardOpen(true)
  }

  return (
    <Shell>
      <Sidebar>
        <Brand>
          <BrandMark>O</BrandMark>
          <BrandName>Good Game</BrandName>
        </Brand>
        <Nav>
          <NavButton
            aria-label='My games'
            $active={activeView === 'games'}
            onClick={() => onNavigate?.('games')}
          >
            <NavIcon>▦</NavIcon>
            <span>My games</span>
          </NavButton>
          <NavButton
            aria-label='Worker ping test'
            $active={activeView === 'worker-ping'}
            onClick={() => onNavigate?.('worker-ping')}
          >
            <NavIcon>↔</NavIcon>
            <span>Worker ping</span>
          </NavButton>
          <NavButton
            aria-label='Updates test'
            $active={activeView === 'updates-test'}
            onClick={() => onNavigate?.('updates-test')}
          >
            <NavIcon>⟳</NavIcon>
            <span>Updates test</span>
          </NavButton>
          <NavButton
            aria-label='My notes'
            $active={activeView === 'notes'}
            onClick={() => onNavigate?.('notes')}
          >
            <NavIcon>▤</NavIcon>
            <span>My notes</span>
          </NavButton>
          <NavButton>
            <NavIcon>＋</NavIcon>
            <span>Create</span>
          </NavButton>
          <NavButton>
            <NavIcon>◎</NavIcon>
            <span>Friends</span>
          </NavButton>
        </Nav>
        <Profile>
          <Avatar $color='#baff39'>YO</Avatar>
          <ProfileText>
            <strong>Your profile</strong>
            <span>Ready to play</span>
          </ProfileText>
        </Profile>
      </Sidebar>

      <Main>
        {activeView === 'games' && (
          <>
            <Header>
              <div>
                <Eyebrow>Welcome back</Eyebrow>
                <Title>My games</Title>
              </div>
              <PrimaryButton onClick={() => setCreateOpen(true)}>
                <Plus>＋</Plus>
                <span>New game</span>
              </PrimaryButton>
            </Header>

            <Toolbar>
              <Tabs>
                <Tab $active={filter === 'all'} onClick={() => setFilter('all')}>
                  All
                </Tab>
                <Tab $active={filter === 'active'} onClick={() => setFilter('active')}>
                  In play
                </Tab>
                <Tab $active={filter === 'finished'} onClick={() => setFilter('finished')}>
                  Finished
                </Tab>
              </Tabs>
              <Count>
                {visibleGames.length} {visibleGames.length === 1 ? 'game' : 'games'}
              </Count>
            </Toolbar>

            <Grid>
              {visibleGames.map((game) => (
                <Card key={game.id} $finished={game.status === 'finished'}>
                  <CardHeader>
                    <GameTitle>{game.title}</GameTitle>
                    <StatusPill $status={game.status}>{statusLabel(game)}</StatusPill>
                  </CardHeader>
                  <Players>
                    <PlayerAvatar $color={game.me.color}>{game.me.initial}</PlayerAvatar>
                    {game.opponent ? (
                      <>
                        <AvatarWithOffset $color={game.opponent.color}>
                          {game.opponent.initial}
                        </AvatarWithOffset>
                        <Versus>vs. {game.opponent.name}</Versus>
                      </>
                    ) : (
                      <Versus>Waiting for a friend</Versus>
                    )}
                  </Players>
                  <MiniBoard>
                    {game.board.map((mark, index) => (
                      <MiniSquare key={index} data-mark={mark ?? ''}>
                        {mark}
                      </MiniSquare>
                    ))}
                  </MiniBoard>
                  <CardFooter>
                    <Updated>{game.updatedAt}</Updated>
                    <CardActions>
                      <IconButton
                        aria-label={`Delete ${game.title}`}
                        onClick={() => void deleteGame(game.id)}
                      >
                        ×
                      </IconButton>
                      {game.status === 'new' ? (
                        <TextButton
                          onClick={() => {
                            setSelectedGame(game)
                            setInviteOpen(true)
                          }}
                        >
                          Invite
                        </TextButton>
                      ) : (
                        <TextButton onClick={() => openBoard(game)}>Open</TextButton>
                      )}
                    </CardActions>
                  </CardFooter>
                </Card>
              ))}
            </Grid>
          </>
        )}
        <div hidden={activeView !== 'worker-ping'}>{workerPingTest}</div>
        <div hidden={activeView !== 'updates-test'}>{workerUpdatesTest}</div>
        <div hidden={activeView !== 'notes'}>{notesView}</div>
      </Main>

      {createOpen && (
        <Overlay
          onMouseDown={(event) => event.target === event.currentTarget && setCreateOpen(false)}
        >
          <Modal>
            <ModalHeader>
              <ModalTitle>Create a new game</ModalTitle>
              <IconButton aria-label='Close' onClick={() => setCreateOpen(false)}>
                ×
              </IconButton>
            </ModalHeader>
            <Form onSubmit={(event) => void createGame(event)}>
              <Label htmlFor='game-name'>Game name</Label>
              <Input
                id='game-name'
                autoFocus
                value={gameName}
                onChange={(event) => setGameName(event.target.value)}
                placeholder='Sunday match'
              />
              <ModalActions>
                <SecondaryButton type='button' onClick={() => setCreateOpen(false)}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type='submit'>
                  <Plus>＋</Plus>
                  <span>Create game</span>
                </PrimaryButton>
              </ModalActions>
            </Form>
          </Modal>
        </Overlay>
      )}

      {inviteOpen && selectedGame && (
        <Overlay
          onMouseDown={(event) => event.target === event.currentTarget && setInviteOpen(false)}
        >
          <Modal>
            <ModalHeader>
              <ModalTitle>Invite a friend</ModalTitle>
              <IconButton aria-label='Close' onClick={() => setInviteOpen(false)}>
                ×
              </IconButton>
            </ModalHeader>
            <Form onSubmit={(event) => void inviteFriend(event)}>
              <Label htmlFor='friend-name'>Friend's name</Label>
              <Input
                id='friend-name'
                autoFocus
                value={friendName}
                onChange={(event) => setFriendName(event.target.value)}
                placeholder='Alex Morgan'
                required
              />
              <ModalActions>
                <SecondaryButton type='button' onClick={() => setInviteOpen(false)}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type='submit'>
                  <span>Send invite</span>
                </PrimaryButton>
              </ModalActions>
            </Form>
          </Modal>
        </Overlay>
      )}

      {boardOpen && selectedGame && (
        <Overlay
          onMouseDown={(event) => event.target === event.currentTarget && setBoardOpen(false)}
        >
          <BoardModal>
            <ModalHeader>
              <div>
                <ModalTitle>{selectedGame.title}</ModalTitle>
                <BoardStatus>{statusLabel(selectedGame)}</BoardStatus>
              </div>
              <IconButton aria-label='Close' onClick={() => setBoardOpen(false)}>
                ×
              </IconButton>
            </ModalHeader>
            <LargeBoard>
              {selectedGame.board.map((mark, index) => (
                <LargeSquare
                  key={index}
                  data-mark={mark ?? ''}
                  disabled={selectedGame.status !== 'my-turn' || mark !== null}
                  onClick={() => void playMove(index)}
                  aria-label={`Square ${index + 1}${mark ? `, ${mark}` : ''}`}
                >
                  {mark}
                </LargeSquare>
              ))}
            </LargeBoard>
          </BoardModal>
        </Overlay>
      )}
    </Shell>
  )
}

export { createInMemoryTicTacToeApi }
