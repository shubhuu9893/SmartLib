import { useApp } from '../context/AppContext';
import useAsync from './useAsync';

export default function useRecommendations() {
  const { loadRecommendations, recsVersion } = useApp();
  const state = useAsync(() => loadRecommendations(), [recsVersion]);
  return { ...state, reload: () => loadRecommendations({ force: true }).then(() => state.reload()) };
}
