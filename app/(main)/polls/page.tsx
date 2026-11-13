import {
  loadPolls,
  PollsUnavailable,
  PollsView,
} from "@/components/polls/PollsView";

export const metadata = {
  title: "Polls",
};

export default async function PollsPage() {
  const polls = await loadPolls();

  if (!polls?.length) {
    return <PollsUnavailable offline={polls === null} />;
  }

  return <PollsView polls={polls} poll={polls[0]} />;
}
