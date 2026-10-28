import { EnvelopeIcon, FacebookMark, GitHubMark, LinkedInMark } from "@/components/icons";
import { site } from "@/lib/site";

const LINKS = [
  { label: "Email", href: `mailto:${site.email}`, Icon: EnvelopeIcon },
  { label: "GitHub", href: site.github, Icon: GitHubMark },
  { label: "LinkedIn", href: site.linkedin, Icon: LinkedInMark },
  { label: "Facebook", href: site.facebook, Icon: FacebookMark },
];

// Icon-only links: the label is the accessible name and shows as a tooltip on hover or focus.
export function SocialLinks() {
  return (
    <ul className="socials">
      {LINKS.map(({ label, href, Icon }) => (
        <li key={label}>
          <a className="social" href={href} aria-label={label} data-tip={label}>
            <Icon />
          </a>
        </li>
      ))}
    </ul>
  );
}
