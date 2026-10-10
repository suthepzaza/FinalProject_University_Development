export default function AcademicHistory({ records }) {
  const grades = ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D'];
  const credits = records.reduce((sum, r) => sum + (grades.includes(r.grade) ? r.courseId?.credits || 0 : 0), 0);
  const terms = [...new Set(records.map(r => r.term))].sort().reverse();
  return <section><h2>Academic history</h2><p>Total credits earned: {credits}</p>
    {terms.map(term => <div key={term}><h3>{term}</h3><table><thead><tr><th>Course</th><th>Grade</th><th>Status</th></tr></thead>
      <tbody>{records.filter(r => r.term === term).map(r => <tr key={r._id}><td>{r.courseId?.code} ? {r.courseId?.title}</td><td>{r.grade}</td><td>{r.grade === 'F' ? 'Retake required' : ''}</td></tr>)}</tbody></table></div>)}
    {!records.length && <p>No completed courses.</p>}</section>;
}
