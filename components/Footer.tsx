import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-charcoal text-cream">
      <div className="max-w-7xl mx-auto px-8 py-16 grid grid-cols-1 md:grid-cols-4 gap-12">
        {/* Contact */}
        <div>
          <h3 className="font-display text-xl mb-4">Tea Atelier</h3>
          <p className="font-body text-sm text-cream/70 leading-relaxed">
            123 Leaf Street
            <br />
            Quezon City, PH
          </p>
          <p className="font-body text-sm text-cream/70 mt-3">
            hello@teaatelier.com
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-body text-xs tracking-[0.15em] uppercase text-cream/50 mb-4">
            Quick Links
          </h4>
          <ul className="space-y-2 font-body text-sm text-cream/80">
            <li>
              <Link href="/" className="hover:text-sage-light transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link href="/shop" className="hover:text-sage-light transition-colors">
                Shop
              </Link>
            </li>
            <li>
              <Link href="/collections" className="hover:text-sage-light transition-colors">
                Collections
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-sage-light transition-colors">
                About
              </Link>
            </li>
          </ul>
        </div>

        {/* FAQs & Privacy */}
        <div>
          <h4 className="font-body text-xs tracking-[0.15em] uppercase text-cream/50 mb-4">
            Support
          </h4>
          <ul className="space-y-2 font-body text-sm text-cream/80">
            <li>
              <Link href="/faq" className="hover:text-sage-light transition-colors">
                FAQs
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-sage-light transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <a href="#" className="hover:text-sage-light transition-colors">
                Shipping & Returns
              </a>
            </li>
            <li>
              <Link href="/contact" className="hover:text-sage-light transition-colors">
                Contact Us
              </Link>
            </li>
          </ul>
        </div>

        {/* Social */}
        <div>
          <h4 className="font-body text-xs tracking-[0.15em] uppercase text-cream/50 mb-4">
            Follow
          </h4>
          <ul className="space-y-2 font-body text-sm text-cream/80">
            <li>
              <a href="#" className="hover:text-sage-light transition-colors">
                Instagram
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-sage-light transition-colors">
                Pinterest
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-sage-light transition-colors">
                TikTok
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/10 px-8 py-6 text-center space-y-2">
        <p className="font-body text-xs text-cream/50">
          © {new Date().getFullYear()} Tea Atelier. All rights reserved.
        </p>
        <p className="font-body text-xs text-cream/50">
          Address data: Philippine Standard Geographic Code (PSGC), Philippine
          Statistics Authority,{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-sage-light transition-colors"
          >
            CC BY 4.0
          </a>
          . Filtered to Luzon and reduced to code and name fields.
        </p>
      </div>
    </footer>
  );
}