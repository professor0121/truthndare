# Task List: Next.js Frontend Implementation

## Phase 1: Scaffolding and Core Configs
- [/] Initialize Next.js project inside `/frontend` directory
- [ ] Install packages (`@reduxjs/toolkit`, `react-redux`, `redux-persist`, `gsap`, `lenis`, `axios`, `lucide-react`, `socket.io-client`)
- [ ] Configure Tailwind CSS and add global styles with visual guidelines (glassmorphism tokens)
- [ ] Set up Axios API client and Socket.io manager
- [ ] Implement Redux store with slices (`auth`, `room`, `game`, `chat`) and Redux-Persist setup

## Phase 2: Authentication & Profile Features
- [ ] Create core landing page layout with animated transition
- [ ] Implement Login and Register UI
- [ ] Implement Guest Play UI
- [ ] Create Profile settings and Avatar selection modal
- [ ] Support Guest conversion to registered user

## Phase 3: Dashboard & Room Lifecycle
- [ ] Build Player Dashboard interface
- [ ] Implement Create Room modal
- [ ] Implement Join Room section
- [ ] Build Public Lobbies lists with refresh capabilities
- [ ] Create Room Lobby view with active player indicators & presence lights

## Phase 4: Real-time Game Loop Arena
- [ ] Design Game Room layout
- [ ] Implement Interactive SVG Bottle Spinner Component with GSAP animation
- [ ] Build Turn Console (Truth/Dare choice buttons, synchronized timers)
- [ ] Integrate Question Delivery animations (GSAP flip card)
- [ ] Add ScoreBoard updates & Game Completed winner screen

## Phase 5: Chat, Social Reactions & Notifications
- [ ] Implement live chat panel within the room sidebar
- [ ] Implement emoji reaction overlay with GSAP floating particles animation
- [ ] Write Custom Service Worker (`public/sw.js`) and push notification setup
- [ ] Request push permissions and subscribe to the backend notifications API
- [ ] Perform build verification & dual-browser end-to-end tests
