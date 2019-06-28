import { all } from 'redux-saga/effects';
import commonSagas from './app/common/duck/sagas';
import planSagas from './app/plan/duck/sagas';

export default function* rootSaga() {
  yield all([commonSagas.watchDataListPolling(), planSagas.watchStatusPolling()]);
}
