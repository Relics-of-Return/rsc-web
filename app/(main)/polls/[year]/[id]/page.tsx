import { notFound, redirect } from "next/navigation";

import {
  loadPolls,
  PollsUnavailable,
  PollsView,
} from "@/components/polls/PollsView";
import { pollPath } from "@/lib/polls";

interface PollPageProps {
  params: Promise<{ year: string; id: string }>;
}

export async function generateMetadata({ params }: PollPageProps) {
  const { id } = await params;
  const poll = (await loadPolls())?.find((p) => String(p.id) === id);

  return { title: poll ? `${poll.title} · Polls` : "Polls" };
}

export default async function PollPage({ params }: PollPageProps) {
  const { year, id } = await params;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const polls = await loadPolls();

  if (polls === null) {
    return <PollsUnavailable offline />;
  }

  const poll = polls.find((p) => String(p.id) === id);

  if (!poll) {
    notFound();
  }

  // an admin can move a poll's open date to another year after links went out
  if (pollPath(poll) !== `/polls/${year}/${id}`) {
    redirect(pollPath(poll));
  }

  return <PollsView polls={polls} poll={poll} />;
}
