/**
 * Frontend games registry. Maps a game key to its route + component.
 * To add a game: build its component and add one entry here — App.jsx renders
 * a route for each, and the Games hub lists them (metadata comes from the API).
 */
import ClickerGame from '../pages/games/ClickerGame';

// Note: the property game ("Estates") moved out of the Games hub into the
// Academy (per-classroom). See src/pages/academy/AcademyEstate.jsx.
export const GAMES = [
  { key: 'clicker', path: '/games/clicker', Component: ClickerGame },
];
