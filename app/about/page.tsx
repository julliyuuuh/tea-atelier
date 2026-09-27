"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Hero {
  heading: string;
  subheading: string;
}

interface Story {
  eyebrow: string;
  heading: string;
  paragraph_1: string;
  paragraph_2: string;
  image_url: string;
}

interface Pillar {
  id: number;
  title: string;
  copy: string;
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
  image: string;
}

export default function AboutPage() {
  const [hero, setHero] = useState<Hero | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAll() {
      try {
        const [heroRes, storyRes, pillarsRes, teamRes] = await Promise.all([
          fetch("/api/cms/about-hero", { signal: controller.signal }),
          fetch("/api/cms/about-story", { signal: controller.signal }),
          fetch("/api/cms/about-pillars", { signal: controller.signal }),
          fetch("/api/cms/about-team", { signal: controller.signal }),
        ]);

        const [heroData, storyData, pillarsData, teamData] = await Promise.all([
          heroRes.json(),
          storyRes.json(),
          pillarsRes.json(),
          teamRes.json(),
        ]);

        setHero(heroData.hero);
        setStory(storyData.story);
        setPillars(pillarsData.pillars);
        setTeam(teamData.team);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error(error.message);
        }
      }
    }

    loadAll();
    return () => controller.abort();
  }, []);

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
          {hero && (
            <>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="font-display text-5xl text-charcoal mb-6"
              >
                {hero.heading}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="font-body text-lg text-charcoal/70 leading-relaxed max-w-xl mx-auto"
              >
                {hero.subheading}
              </motion.p>
            </>
          )}
        </div>
      </div>

      {/* Two-column: story + image */}
      {story && (
        <div className="max-w-6xl mx-auto px-8 py-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <span className="font-body text-xs tracking-[0.2em] uppercase text-sage mb-4 block">
              {story.eyebrow}
            </span>
            <h2 className="font-display text-3xl text-charcoal mb-6">
              {story.heading}
            </h2>
            <p className="font-body text-charcoal/70 leading-relaxed mb-4">
              {story.paragraph_1}
            </p>
            <p className="font-body text-charcoal/70 leading-relaxed">
              {story.paragraph_2}
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
              src={story.image_url}
              alt="Tea leaves"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      )}

      {/* Pillars */}
      {pillars.length > 0 && (
        <div className="bg-sand/30 py-20">
          <div className="max-w-5xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
            {pillars.map((item, i) => (
              <motion.div
                key={item.id}
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
      )}

      {/* Meet the Team */}
      {team.length > 0 && (
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
                key={member.id}
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
      )}

      <Footer />
    </main>
  );
}