/**
 * Agent avatar images sourced from Stitch MCP design system.
 * Maps agent archetypes and IDs to AI-generated portrait URLs.
 */

// Portrait images from Stitch design
export const STITCH_AVATARS = {
  // By archetype type
  striker:   "https://lh3.googleusercontent.com/aida-public/AB6AXuDrsXInL-akvbNWYFbgEri9U7l9QT4uLdn6dp7xi2MHn7nWlNzw8_qmWozo6V69Vz1UnWBuiVre94b5s8TV6SuFicWHREMFYJiuclhwYQWagLrb8jbt2NRRgsKmh8wm64m_9iVygYqftZk4bgM7rmkzzmT0EQG3UwYQR_o6T4viK0M_hx6lSoyfhd_8_dX-QjwcMzfObwBZ6PKNLvXWaACVJYgtWL5gvJXU4S9-iocwI-poeyWpji6PdvulVWqmLuq05rQ6FMQ9piA",
  phantom:   "https://lh3.googleusercontent.com/aida-public/AB6AXuCP3n_k1hIBBrbpMY9NxrngByR85zR_-L53Aen7CMrWj3A_c7y7e7C3MztSdCY6ZcIhZKT0l_gl3Ij2Ok_j3BXchX0xE2J_fkJtJSJe95fpRA777pXRlOjzAZ25dre6GVw_sYLiOLRBfpC6s3FmDO1fJRKP_rCj62HfEcH1whSFgOf2zaFf9xHoFpr4tVWBXGEtBOQsD5he29VseWPrnlVwYbMou-1bp1rGITLxNbZMB5MGbGAt8nmcuEYbcbuqFg7RIczK-IafnJU",
  ironclad:  "https://lh3.googleusercontent.com/aida-public/AB6AXuAGtyltrmS3Np_64BAlVx63OpE9fdG1ATcmFA6Y1esQu1bTQ9_71N1BGhAstGOAg4u1mfTBF6sOBTg_p_9HQxFpHbEmc5cl7aAer6P3crTICjwXGflE6-L2NZlwmP5xM043mrNeaQawdA_Y39jKMD7WA3D_ch5q36V5qpilovUXmxMtUl-y-OK2A4tkjrv7QyfutJcARLSpkDIL5kar2Ok_7LKSoTBX6rZrKxzgYE4dw7aLG1GDVat8ktOFub81ZeZpDaNCV6Si-DQ",
  viper:     "https://lh3.googleusercontent.com/aida-public/AB6AXuBS-_VbIZHfQTDQOI3j7VAP-I2AS8DAqPujDDm1PGkYmqhz9crZVQXRwfnwb6pF9eJCAvvBb6KTeb8okOMtzJIAkYsEYNUjgxukaumgVEVtJLmjt69EVRvW4YzBveMcy_8Jl9fetUeEpQAmSTsrKkSaRdMJKD-6nteEZ2UqeN6nf3JEtNVOaOgcN7J9XfevsXr7HYlY1EiqL1CsS0dnDyxoYw5__59c8zLfCuPGz7L3Z79ykKxo_AIrmBgWFk500_puRZTkiWPUa4M",
  chimera:   "https://lh3.googleusercontent.com/aida-public/AB6AXuAjdBvI7chczvau0Sl_RbgarMxxzxGQvF0NzuJ6uivZBLwoE0vnEL5uJrLAFnU4-Q-8UNB15NjbEEegGIbVOzQsICse0a_i9ovvnw-3xe64QOMzLvh6Z96JiYC_X_1PtbU7atjm_Zpq6DCTI0Dp86oM0YN8a-P6bkAnZcZ1KjjBu1XBAeH5cJ1zPjqL0EtrJE-fsYSznXVl_-FHN74gMYASJSgAtgqia05TmBtqFoWXCKROo5rAAYYKgwLSWZ5lw1F2ZsaqjfZDV5U",
  sentinel:  "https://lh3.googleusercontent.com/aida-public/AB6AXuD3yjHWUrqgeeGbXlZhzJmr3hLKZRDvZj177pYSFcszIE-5_ByCZNBKbE9Gf9qnNiZjKSRNKA7BYpOVfhva37p8N_JTkdcLQxGhtITTibfIiPVPWsXhWE9DRWFsdi102igv4ytfZa9nESnaAuaTjgnHwqDlsdkDyU3xEiD-o9QMRrl1zsw1JK0bIakYzkrbvJ2bWj_nrg2qHyuozvmklCSo7yx4dktnISMbQtTIbc31EEdoLm-_k1RUziqsd8Sw6yuefXclIsd9nvQ",
  kaizen:    "https://lh3.googleusercontent.com/aida-public/AB6AXuC-RR5F9cIaudkf0mwhOYmmq6SLUqYlliKmaat1zFL_TStezHkmMN-hPZZKUDmJOPaxZlDugQOAbySZm4W-zA0mlt56dD-av_lHi0HVBEU7Ig_jvrM9gdQEzn8T-Y3eNtvJtNwA8E63dLUnrdodU1kY0pd3JxgIWN6dsm3CJ_Z0pkhYRPvqO9HXEw92hiQdDjZhPK8pudZY20pS1KS_8xmrqdgYCyRR4my8ZrJ6qf-HGwg2ZW6d1l0Deku4ZCBJEJc3mTUW36kcWj4",
  mirage:    "https://lh3.googleusercontent.com/aida-public/AB6AXuBADmGvqQumYzQKo2e7rg0RZkg4MQrSioGftFb3a0jrVmhf3B91I0DGdjrtRTPSouFXXVHBihce4hSncigLLld6fhwgEN27R8lw2PEE7LrBaezd0ZdJfXZiF_uFyRDNROpZAtLIjzeDM85nizGI_Nks5OtSc9KDMKyh25BGj_ktOhIAQUnrgCW5Ij7v11Lj116aHdsC0tVRVEBCyHCmQS41Ydf_wLTg7HnHCvL18bJl0uGK0UJXpXwg9Pk6q_gCWwFkSzhy4uxII_g",
} as const;

// Map known agent IDs to portraits — AI-generated for main agents, Stitch for others
const AGENT_ID_MAP: Record<string, string> = {
  "momentum-bot":  "/avatars/striker.png",             // Striker — AI-generated (Net Dominator, Aggressive)
  "mean-revert":   "/avatars/phantom.png",             // Phantom — AI-generated (Counter Specialist, Defensive)
  "cmn81aphe0000lg2tbcqpvh7s": "/avatars/phantomx.png", // Phantom X — AI-generated (Net Dominator, Moderate)
  "whale-follower": STITCH_AVATARS.chimera,            // Apex / green / adaptive
  "diversi-bot":   STITCH_AVATARS.ironclad,            // Iron / gold / endurance
};

// Map archetype keywords to portraits
const ARCHETYPE_MAP: Array<[string, string]> = [
  ["net dominator",        STITCH_AVATARS.striker],
  ["counter specialist",   STITCH_AVATARS.phantom],
  ["adaptive all-rounder", STITCH_AVATARS.chimera],
  ["endurance baseliner",  STITCH_AVATARS.ironclad],
  ["power hitter",         STITCH_AVATARS.kaizen],
  ["speed demon",          STITCH_AVATARS.viper],
  ["stealth",              STITCH_AVATARS.mirage],
  ["tactical",             STITCH_AVATARS.sentinel],
  ["defender",             STITCH_AVATARS.ironclad],
  ["challenger",           STITCH_AVATARS.striker],
];

/**
 * Get avatar URL for an agent by ID, archetype, or fallback to color-matched portrait.
 */
export function getAgentAvatar(agentId: string, archetype?: string): string {
  // 1. Known agent ID
  if (AGENT_ID_MAP[agentId]) return AGENT_ID_MAP[agentId];

  // 2. Archetype keyword match
  if (archetype) {
    const lower = archetype.toLowerCase();
    for (const [keyword, url] of ARCHETYPE_MAP) {
      if (lower.includes(keyword)) return url;
    }
  }

  // 3. Deterministic fallback from agent ID hash
  const values = Object.values(STITCH_AVATARS);
  const hash = agentId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return values[hash % values.length];
}

// Archetype cards for the agent builder selection grid
export const ARCHETYPE_CARDS = [
  {
    type: "STRIKER",
    name: "Net Dominator",
    desc: "Controls the net with precision drops and kill shots",
    stats: { SPD: 9, PWR: 9, STA: 5, ACC: 7 },
    img: STITCH_AVATARS.striker,
    color: "#8ff5ff",
  },
  {
    type: "STEALTH",
    name: "Counter Specialist",
    desc: "Reads opponents and turns defence into devastating attack",
    stats: { SPD: 7, PWR: 6, STA: 9, ACC: 9 },
    img: STITCH_AVATARS.phantom,
    color: "#b0a4ff",
  },
  {
    type: "ADAPTIVE",
    name: "Adaptive All-Rounder",
    desc: "Evolves strategy round by round to exploit weaknesses",
    stats: { SPD: 8, PWR: 7, STA: 8, ACC: 8 },
    img: STITCH_AVATARS.chimera,
    color: "#49f3a6",
  },
  {
    type: "TANK",
    name: "Endurance Baseliner",
    desc: "Outlasts opponents with iron-willed stamina and patience",
    stats: { SPD: 5, PWR: 6, STA: 10, ACC: 8 },
    img: STITCH_AVATARS.ironclad,
    color: "#ffd479",
  },
  {
    type: "POWER",
    name: "Power Hitter",
    desc: "Overwhelms opponents with raw strength and explosive smashes",
    stats: { SPD: 7, PWR: 10, STA: 6, ACC: 6 },
    img: STITCH_AVATARS.kaizen,
    color: "#ff6c92",
  },
  {
    type: "SPEED",
    name: "Speed Demon",
    desc: "Blazing footwork and rapid-fire returns that never quit",
    stats: { SPD: 10, PWR: 5, STA: 8, ACC: 7 },
    img: STITCH_AVATARS.viper,
    color: "#ffe6aa",
  },
] as const;
