export default function Home() {
  return <div>Database URL is set: {process.env.DATABASE_URL ? 'yes' : 'no'}</div>;
}
