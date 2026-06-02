const RULES = [
  {
    title: "Scoring",
    short: "Serving team scores only. First to 15, win by 2. Best of 3 games.",
    body: (
      <>
        <p>
          Points can only be scored by the serving team. The team that reaches
          15 points while leading by at least 2 points wins the game.
        </p>

        <p>
          The first team to win 2 games wins the match.
        </p>
      </>
    ),
  },
  {
    title: "Number of Players",
    short: "League play is intended to be 6 on 6. Teams may play with as few as 4.",
    body: (
      <>
        <p>
          League play is intended to be 6 on 6. Teams may play with as few as 4.
        </p>

        <p>
          Fewer than 4 players will result in a forfeit of the match.
        </p>
      </>
    ),
  },
  {
    title: "Positions",
    short: "Front row and back row rules, including attack-line restrictions.",
    body: (
      <>
        <p>
          The primary distinction is between front row and back row positions.
          The number of front row positions is always 3. The number of back row
          positions will ordinarily be 3, although a team fielding 5 or 4
          players will have only 2 or 1 back row positions.
        </p>

        <p>
          Players in the back row may not block. Players in the back row may
          only attack if, in leaving the ground, both feet are behind the attack
          line, which is 9&apos;10&quot; from the net.
        </p>

        <p>
          Players in the back row may hit the ball over the net from within the
          attack line if their contact is not an attack, namely if the ball is
          below the top of the net.
        </p>

        <p>
          At the moment of the serve, players&apos; locations on the court must
          match their position. For example, the front left player must have
          some part of their foot closer to the left sideline than the front
          center player, and some part of their foot closer to the net than the
          back left player.
        </p>

        <p>
          Once the server has struck the ball, players may move as they wish,
          but a back row player is still restricted from blocking and from
          attacking within the attack line.
        </p>
      </>
    ),
  },
  {
    title: "Rotation",
    short: "After a side out, the receiving team rotates clockwise.",
    body: (
      <>
        <p>
          Upon regaining the serve, also called achieving a side out, the
          receiving team must rotate one position clockwise as viewed from
          above.
        </p>

        <p>
          Exception: upon gaining the serve for the first time in a game, the
          team has the option of staying in their starting positions.
        </p>

        <p>
          Players may also rotate on or off the court to allow the participation
          of more than 6 people. The rotation order and location should be set
          at the beginning of the game and maintained throughout that game.
        </p>

        <p>
          Players may be designated for exclusion from rotating out of the game.
          After a side out, these players simply move to the next position.
          Again, such patterns must be maintained throughout the entire game.
        </p>
      </>
    ),
  },
  {
    title: "Net Play",
    short: "Respect the net rules. They are the biggest safety issue.",
    body: (
      <>
        <p>
          Contact with the net by any part of a player&apos;s body other than
          hair will result in loss of the point.
        </p>

        <p>
          Exception: if the ball hits the net and pushes the net into contact
          with the player, that is not a net violation.
        </p>

        <p>
          You cannot reach over the net except to block an attacked ball. Even
          then, you must not interfere with the hitter. You can only block the
          ball after the hitter has made contact.
        </p>

        <p>
          Once the ball breaks the plane of the net, you may block or hit it.
          Thus, when the ball is over the net, both teams&apos; front row
          players may hit or block it, subject to the rules regarding
          consecutive contacts.
        </p>

        <p>
          You can only pass under the net to the extent that some part of your
          limb is still in contact with your side of the court. Some part of
          your foot must still be directly under the net.
        </p>

        <p>
          The rule against passing under the net is arguably the single most
          important one, and the rule with the least room for flexibility.
          Players striding under the net create serious injury risk.
        </p>

        <p>
          Historically, net violations have also been one of the biggest sources
          of disputes on the court. Please respect the game and your opponents
          and call your own net violations. It will make the game safer and more
          enjoyable for everyone.
        </p>
      </>
    ),
  },
  {
    title: "Serving",
    short: "Server stands behind the back line. Let serves are in play.",
    body: (
      <>
        <p>
          The server is the player in the back right position, or the equivalent
          position on a 5 or 4 player team, after rotation.
        </p>

        <p>
          The server may stand or jump from anywhere behind the back line and
          between the imaginary extension of the side lines.
        </p>

        <p>
          A serve that hits the net is in play.
        </p>

        <p>
          The receiving team may not block or attack the serve. It is fine for
          the receiving team to set the served ball.
        </p>
      </>
    ),
  },
  {
    title: "First Serve / Court Side",
    short: "Volley for first serve or side choice. Alternate after that.",
    body: (
      <>
        <p>
          Volley for the first serve or court side choice. The ball must pass
          over the net 3 times without attack. After that, continue the point as
          usual.
        </p>

        <p>
          The winning team may choose to serve first or choose their side of the
          court.
        </p>

        <p>
          Sides and first serve alternate in subsequent games.
        </p>

        <p>
          In the third game, switch sides every 5 scored points. This rule may
          be ignored if both teams agree.
        </p>
      </>
    ),
  },
  {
    title: "Rosters",
    short: "You can only play for one team during the season.",
    body: (
      <>
        <p>
          You can only play for one team. Once you have played a single point
          for one team at any time in the season, playing for any other team
          will result in a forfeit of the latter match.
        </p>

        <p>
          This is really the only rule regarding who can play on what team, and
          this openness is one of the more charming things about the Rhino
          League. With that freedom comes the responsibility to uphold the spirit
          of the league.
        </p>
      </>
    ),
  },
];

export default function RulesSection() {
  return (
    <div
      id="rules"
      className="rounded-[2rem] border border-[#A51C30]/30 bg-[#230B12]/85 p-6 shadow-2xl shadow-black/30"
    >
      <div className="mb-5">
        <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-[#F3EEE6]">
          Rules
        </p>

        <h2 className="text-2xl font-black text-white">
          League rules
        </h2>

        <p className="mt-2 text-sm text-red-100/60">
          Click any section to expand. These are the official-ish rules, cleaned
          up so they are easier to read during inevitable league disputes.
        </p>
      </div>

      <div className="grid gap-3">
        {RULES.map((rule, index) => (
          <details
            key={rule.title}
            className="group rounded-2xl border border-[#A51C30]/25 bg-black/20 transition hover:border-[#A51C30]/50 hover:bg-black/30 open:border-[#C4963E]/45 open:bg-black/30"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-4">
              <div className="flex gap-4">
                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A51C30]/30 text-sm font-black text-[#F3EEE6] sm:flex">
                  {index + 1}
                </div>

                <div>
                  <h3 className="text-lg font-black text-white">
                    {rule.title}
                  </h3>

                  <p className="mt-1 text-sm text-red-100/60">
                    {rule.short}
                  </p>
                </div>
              </div>

              <span className="mt-1 rounded-full border border-[#A51C30]/30 bg-[#A51C30]/15 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-red-100 transition group-open:bg-[#C4963E]/20 group-open:text-[#F3EEE6]">
                <span className="group-open:hidden">Read</span>
                <span className="hidden group-open:inline">Close</span>
              </span>
            </summary>

            <div className="border-t border-[#A51C30]/20 px-4 pb-5 pt-1 sm:pl-[4.5rem]">
              <div className="grid gap-3 text-sm leading-6 text-red-100/75">
                {rule.body}
              </div>
            </div>
          </details>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-[#C4963E]/30 bg-[#C4963E]/10 p-4">
        <p className="text-sm font-bold text-[#F3EEE6]">
          Quick reminder:
        </p>

        <p className="mt-1 text-sm text-red-100/70">
          Call your own violations, keep it safe, and do not be the reason we
          need a 40-page rulebook.
        </p>
      </div>
    </div>
  );
}