import { notFound, redirect } from "next/navigation";

import {
  loadPolls,
  PollsUnavailable,
  PollsView,
} from "@/components/polls/PollsView";
import { pollYear } from "@/lib/polls";

export const metadata = {
  title: "Polls",
};

interface PollYearPageProps {
  params: Promise<{ year: string }>;
}

/** /polls/<year>: that year's newest poll; /polls/latest is /polls. */
export default async function PollYearPage({ params }: PollYearPageProps) {
  const { year } = await params;

  if (year === "latest") {
    redirect("/polls");
  }

  if (!/^\d{4}$/.test(year)) {
    notFound();
  }

  const polls = await loadPolls();

  if (polls === null) {
    return <PollsUnavailable offline />;
  }

  const poll = polls.find((p) => pollYear(p) === Number(year));

  if (!poll) {
    notFound();
  }

  return <PollsView polls={polls} poll={poll} />;
}
