import React from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Brain, 
  Zap, 
  Shield, 
  Users, 
  Award,
  ChevronRight,
  Github,
  Mail,
  Globe
} from 'lucide-react';

const About = () => {
  const features = [
    {
      icon: FileText,
      title: "Advanced OCR Technology",
      description: "State-of-the-art optical character recognition that handles complex layouts, tables, and multilingual content with exceptional accuracy.",
      details: ["Text extraction from scanned PDFs", "Table structure preservation", "Multiple language support"]
    },
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description: "Leveraging cutting-edge language models to understand context, extract insights, and provide intelligent answers to your questions.",
      details: ["Natural language understanding", "Context-aware responses", "Semantic search capabilities"]
    },
    {
      icon: Zap,
      title: "Lightning-Fast Processing",
      description: "Optimized processing pipeline with smart caching and parallel processing ensures quick turnaround times even for large documents.",
      details: ["Parallel processing architecture", "Intelligent caching system", "Real-time progress tracking"]
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Your documents are processed with bank-grade security measures, ensuring complete privacy and data protection.",
      details: ["End-to-end encryption", "Secure file handling", "No data retention policy"]
    }
  ];

  const stats = [
    { number: "10K+", label: "Documents Processed", icon: FileText },
    { number: "99.9%", label: "Uptime Guarantee", icon: Zap },
    { number: "500+", label: "Happy Users", icon: Users },
    { number: "24/7", label: "Support Available", icon: Award }
  ];

  const team = [
    {
      name: "AI Research Team",
      role: "Machine Learning Engineers",
      description: "Experts in NLP, computer vision, and document understanding",
      avatar: "🤖"
    },
    {
      name: "Backend Team",
      role: "Infrastructure Engineers", 
      description: "Specialists in scalable systems and data processing pipelines",
      avatar: "⚡"
    },
    {
      name: "Frontend Team",
      role: "UI/UX Designers",
      description: "Creating intuitive and beautiful user experiences",
      avatar: "🎨"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen py-8 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            About
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent"> DocuChat AI</span>
          </h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto mb-8">
            We're revolutionizing how people interact with documents by combining advanced AI 
            with intuitive design to create the most powerful document processing platform.
          </p>
        </motion.div>

        {/* Mission Statement */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm rounded-3xl p-12 border border-white/20 mb-16"
        >
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-6">Our Mission</h2>
            <p className="text-lg text-white/80 max-w-4xl mx-auto">
              To democratize access to intelligent document processing by making advanced AI 
              technology accessible, affordable, and easy to use for everyone. We believe that 
              information should be searchable, understandable, and actionable.
            </p>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            Powerful Technology Stack
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="group bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300"
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-white/70 mb-4">
                        {feature.description}
                      </p>
                      <ul className="space-y-2">
                        {feature.details.map((detail, i) => (
                          <li key={i} className="flex items-center text-white/60 text-sm">
                            <ChevronRight className="w-4 h-4 mr-2 text-blue-400" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-16"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="text-center group"
                >
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 group-hover:scale-105">
                    <Icon className="w-8 h-8 text-blue-400 mx-auto mb-4" />
                    <div className="text-3xl font-bold text-white mb-2">{stat.number}</div>
                    <div className="text-white/70 text-sm">{stat.label}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Team Section */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mb-16"
        >
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            Meet Our Team
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-center hover:bg-white/20 transition-all duration-300"
              >
                <div className="text-6xl mb-4">{member.avatar}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{member.name}</h3>
                <p className="text-blue-400 font-medium mb-3">{member.role}</p>
                <p className="text-white/70 text-sm">{member.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Contact Section */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 border border-white/20 text-center"
        >
          <h2 className="text-3xl font-bold text-white mb-6">Get In Touch</h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            Have questions about our technology or want to collaborate? We'd love to hear from you!
          </p>
          <div className="flex justify-center space-x-6">
            <a
              href="mailto:contact@docuchat.ai"
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
            >
              <Mail className="w-5 h-5" />
              <span>Email Us</span>
            </a>
            <a
              href="https://github.com/docuchat-ai"
              className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
            >
              <Github className="w-5 h-5" />
              <span>GitHub</span>
            </a>
            <a
              href="https://docuchat.ai"
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
            >
              <Globe className="w-5 h-5" />
              <span>Website</span>
            </a>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default About;