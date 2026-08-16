import React from 'react';
import { Button, Panel, StatusMessage } from '../../design-system/Primitives';
import { HttpAdminChallengeClient, type AdminChallenge } from '../../runtime/AdminChallengeClient';

export function ChallengeBuilderView({ accessToken }: { accessToken?: string }): React.ReactElement {
  const [rows, setRows] = React.useState<AdminChallenge[]>([]);
  const [key, setKey] = React.useState('');
  const [error, setError] = React.useState<string>();
  const client = React.useMemo(() => new HttpAdminChallengeClient(), []);
  const reload = React.useCallback(() => { if (!accessToken) { setRows([]); return; } void client.list(accessToken).then(setRows).catch((reason: Error) => setError(reason.message)); }, [accessToken, client]);
  React.useEffect(reload, [reload]);
  const create = () => { if (!accessToken || !key.trim()) return; void client.create(accessToken, { challengeKey: key, challengeType: 'QUIZ', verificationStrategy: 'quiz.v1', content: {}, rewardPolicy: {}, maxRewardCredits: '1' }).then(() => { setKey(''); reload(); }).catch((reason: Error) => setError(reason.message)); };
  return <Panel title="Challenge builder and moderation">
    <div className="admin-list"><label htmlFor="challenge-key">Challenge key</label><input id="challenge-key" value={key} onChange={(event) => setKey(event.target.value)} placeholder="challenge.example" disabled={!accessToken} /><Button onClick={create} disabled={!accessToken || !key.trim()}>Create draft</Button></div>
    {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
    {!accessToken ? <StatusMessage>Challenge management requires authenticated audited access.</StatusMessage> : <div className="admin-table-wrap"><table className="admin-table"><caption className="sr-only">Challenge definitions</caption><thead><tr><th>Key</th><th>Status</th><th>Version</th><th>Actions</th></tr></thead><tbody>{rows.map((row) => <ChallengeRow key={row.id} row={row} client={client} accessToken={accessToken} reload={reload} />)}</tbody></table></div>}
  </Panel>;
}

function ChallengeRow({ row, client, accessToken, reload }: { row: AdminChallenge; client: HttpAdminChallengeClient; accessToken: string; reload: () => void }): React.ReactElement {
  const act = row.status === 'DRAFT' ? () => client.submit(accessToken, row.id).then(reload) : row.status === 'IN_REVIEW' ? () => client.approve(accessToken, row.id).then(reload) : undefined;
  return <tr><th scope="row">{row.challengeKey}</th><td>{row.status}</td><td>{row.version}</td><td><Button onClick={() => { void act?.().catch(() => undefined); }} disabled={!act}>{row.status === 'DRAFT' ? 'Submit review' : 'Approve/publish'}</Button></td></tr>;
}
