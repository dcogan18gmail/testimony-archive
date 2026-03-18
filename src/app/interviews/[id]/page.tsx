type Params = { id: string };

export default async function InterviewPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 font-sans">
      <h1 className="mb-4 text-2xl font-semibold text-zinc-900">
        Interview: {id}
      </h1>
      <p className="text-zinc-500">Transcript viewer coming in Phase 4</p>
    </div>
  );
}
