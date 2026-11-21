// The words of the sections under the story. Every statement here comes from the app's README; change it there first.

export const FEATURES = [
  {
    id: "diagnostics",
    title: "Find where the path fails",
    text: "Scans run probes against your network and the sites you name, and show what fails and where.",
    image: "/screens/diagnostics.webp",
    alt: "The Diagnostics screen of RIPDPI: a completed scan with 21 probes and their results.",
  },
  {
    id: "connection",
    title: "Fix it on the device",
    text: "VPN mode routes the device's traffic through a local bridge on the phone. Proxy mode gives a SOCKS5 proxy on localhost. Packet strategies are applied on the device, and the core path needs no root.",
    image: "/screens/status.webp",
    alt: "The Status screen of RIPDPI: connected through the local VPN, with connection measurements.",
  },
  {
    id: "dns",
    title: "Seal the names",
    text: "Encrypted DNS over DoH, DoT, DNSCrypt or DoQ, with the built-in resolvers or your own endpoint.",
    image: "/screens/dns.webp",
    alt: "The DNS settings screen of RIPDPI: a custom DNS-over-HTTPS endpoint with bootstrap addresses.",
  },
] as const;

export const EXTRAS = [
  { title: "Remembers each network", text: "Verdicts are kept for each network and replayed when you reconnect." },
  { title: "Probes new networks", text: "On a network it has not seen, RIPDPI probes for a strategy by itself." },
  { title: "Follows handovers", text: "The policy is evaluated again when you move between Wi-Fi, cellular and roaming." },
] as const;

export const STEPS = [
  { title: "Measure", text: "RIPDPI measures why a target fails or degrades on your network." },
  { title: "Apply", text: "It applies configurable packet strategies on the device, through a local VPN or a local proxy." },
  { title: "Relay, if you need one", text: "It can connect through relay servers you control. Our own relays are invite-only." },
] as const;

export const FAQ = [
  {
    q: "Does RIPDPI need root?",
    a: "No. The core path needs no root. On a rooted device, an optional helper unlocks raw-socket operations.",
  },
  { q: "Which Android versions does it support?", a: "Android 8.1 and later." },
  {
    q: "Is RIPDPI a VPN service?",
    a: "No. VPN mode uses Android's VpnService to route traffic through a local bridge on the device. A relay is optional, and it is one you control.",
  },
  {
    q: "Does it record my traffic?",
    a: "Normal operation does not capture packets, keep traffic payloads or record TLS secrets. The app keeps operational metadata for diagnostics, such as network snapshots, resolver status, route decisions and scan results. Packet capture is a separate tool that you must turn on. With a relay, privacy depends on the relay you configure.",
  },
  {
    q: "What is the licence?",
    a: "RIPDPI is dual-licensed: AGPL-3.0-only, or a commercial licence from the author. The source code is on GitHub.",
  },
  { q: "Is it stable?", a: "RIPDPI is in active development, and breaking changes are possible." },
  { q: "Can I use your relays?", a: "Our relay service is invite-only." },
] as const;
