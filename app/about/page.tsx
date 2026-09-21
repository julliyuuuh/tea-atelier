"use client";

import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const team = [
  {
    name: "Jose Luis Arce",
    role: "Co Backend Developer",
    image: "/images/team/Jose.jpg",
  },
  {
    name: "John Bryan Concepcion",
    role: "Backend Developer",
    image: "/images/team/JB.jpg",
  },
  {
    name: "Simon Christian Carmen",
    role: "Co Front-End Designer",
    image: "/images/team/Simon.jpg",
  },
  {
    name: "Jullia De Jesus",
    role: "Front-End Designer",
    image: "/images/team/member4.jpg",
  },
  {
    name: "Francheska Rabanzo",
    role: "UI/UX Designer",
    image: "/images/team/Francheska.jpg",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-8 pt-20 pb-16 text-center">
          <motion.img
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            src="/images/logo-full.png"
            alt="Tea Atelier"
            className="w-48 mx-auto mb-8"
          />
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-5xl text-charcoal mb-6"
          >
            Our Story
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-body text-lg text-charcoal/70 leading-relaxed max-w-xl mx-auto"
          >
            Tea Atelier began with a simple belief: tea should be an experience,
            not just a drink. Every tin we pack, every leaf we source, is chosen
            to bring a small moment of ritual into your day.
          </motion.p>
        </div>
      </div>

      {/* Two-column: story + image */}
      <div className="max-w-6xl mx-auto px-8 py-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
            From Leaf to Cup
          </span>
          <h2 className="font-display text-3xl text-charcoal mb-6">
            Every step, with care
          </h2>
          <p className="font-body text-charcoal/70 leading-relaxed mb-4">
            From the misty slopes where our leaves are grown to the cup in your
            hands, we care about every step in between — sourcing, roasting,
            packing, and the moment you finally sit down to steep.
          </p>
          <p className="font-body text-charcoal/70 leading-relaxed">
            We work in small batches so freshness is never an afterthought, and
            we partner only with growers who treat the land as carefully as we
            treat the leaf.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative h-80 rounded-3xl overflow-hidden bg-sand"
        >
          <img
            src="/images/random-girl.png"
            alt="Tea leaves"
            className="w-full h-full object-cover"
          />
        </motion.div>
      </div>

      {/* Pillars */}
      <div className="bg-sand/30 py-20">
        <div className="max-w-5xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          {[
            {
              title: "Sustainable Sourcing",
              copy: "We partner with growers who protect the land tea calls home, using traditional and regenerative methods.",
            },
            {
              title: "Small Batch",
              copy: "Every tin is packed in small batches to preserve freshness and flavor at its peak.",
            },
            {
              title: "Est. 2026",
              copy: "A young atelier with an old soul — built on ritual, patience, and the pursuit of a perfect cup.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <h3 className="font-display text-xl text-charcoal mb-3">
                {item.title}
              </h3>
              <p className="font-body text-sm text-charcoal/60 leading-relaxed">
                {item.copy}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Meet the Team */}
      <div className="max-w-5xl mx-auto px-8 py-20 text-center">
        <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
          The People Behind It
        </span>
        <h2 className="font-display text-4xl text-charcoal mb-14">
          Meet the Team
        </h2>

        <div className="flex flex-wrap justify-center gap-10 md:gap-14">
          {team.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex flex-col items-center w-32"
            >
              <div className="w-28 h-28 rounded-full overflow-hidden bg-sand mb-4 border-2 border-sage/20">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-display text-base text-charcoal mb-0.5">
                {member.name}
              </h3>
              <p className="font-body text-xs text-charcoal/50 uppercase tracking-wide">
                {member.role}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}
