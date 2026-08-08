export const REWARDS_CHANGED_EVENT = "chatco:rewards-changed";

/** Notify the mounted rewards provider after a ride becomes rewardable. */
export function notifyRewardsChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(REWARDS_CHANGED_EVENT));
  }
}
