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
              <a href="#" className="hover:text-sage-light transition-colors">
                Home
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-sage-light transition-colors">
                Shop
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-sage-light transition-colors">
                Collections
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-sage-light transition-colors">
                About
              </a>
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
              <a href="#" className="hover:text-sage-light transition-colors">
                FAQs
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-sage-light transition-colors">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-sage-light transition-colors">
                Shipping & Returns
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-sage-light transition-colors">
                Contact Us
              </a>
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

      <div className="border-t border-cream/10 px-8 py-6 text-center">
        <span className="font-body text-xs text-cream/50">
          © {new Date().getFullYear()} Tea Atelier. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
