"use client";

import { 
  MdCheckCircle,
  MdDataUsage,
  MdCloud,
  MdSettings 
} from "react-icons/md";

const About = () => {
  return (
    <div className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col gap-12">
          {/* Hero Section */}
          <div className="flex flex-col items-center gap-6 text-center">
            <h1 className="text-4xl font-bold text-blue-600">
              EcoSky AI Platform
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl">
              Revolutionizing aviation through AI-powered route optimization, 
              real-time data analysis, and sustainable flight management.
            </p>
          </div>

          {/* How It Works */}
          <div>
            <h2 className="text-2xl font-bold text-blue-600 mb-8">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: MdDataUsage,
                  title: "Data Integration",
                  content: "Real-time flight & weather data from 20+ sources"
                },
                {
                  icon: MdCloud,
                  title: "AI Optimization",
                  content: "Machine learning models process 1M+ data points/hour"
                },
                {
                  icon: MdSettings,
                  title: "Smart Routing",
                  content: "Dynamic path adjustments for fuel efficiency"
                }
              ].map((item, index) => (
                <div 
                  key={index}
                  className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl shadow-sm"
                >
                  <item.icon className="w-8 h-8 text-blue-500" />
                  <h3 className="text-xl font-semibold text-center">{item.title}</h3>
                  <p className="text-gray-600 text-center">{item.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Features */}
          <div>
            <h2 className="text-2xl font-bold text-blue-600 mb-6">
              Core Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                "Live flight tracking & 3D visualization",
                "Storm prediction up to 6 hours in advance",
                "Fuel consumption analytics",
                "CO₂ emission monitoring",
                "Air traffic pattern analysis",
                "Automatic route recalibration"
              ].map((feature, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 p-3 bg-white rounded-lg"
                >
                  <MdCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Technology Stack */}
          <div>
            <h2 className="text-2xl font-bold text-blue-600 mb-6">
              Technology Stack
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ["AI/ML", "TensorFlow, PyTorch"],
                ["Backend", "Python, Flask, Redis"],
                ["Frontend", "React, Next.js, Three.js"],
                ["Data", "PostgreSQL, Apache Kafka"]
              ].map(([category, tech], index) => (
                <div 
                  key={index}
                  className="p-4 bg-white rounded-md border border-gray-100"
                >
                  <p className="font-semibold text-blue-600">{category}</p>
                  <p className="text-sm text-gray-600 mt-1">{tech}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div>
            <h2 className="text-2xl font-bold text-blue-600 mb-6">
              Key Benefits
            </h2>
            <div className="flex flex-col gap-4">
              {[
                {
                  title: "For Airlines",
                  content: "15-20% fuel savings per long-haul flight"
                },
                {
                  title: "For Environment",
                  content: "Up to 35% reduction in CO₂ emissions"
                },
                {
                  title: "For Passengers",
                  content: "10-25% fewer weather-related delays"
                }
              ].map((benefit, index) => (
                <div 
                  key={index}
                  className="p-4 bg-white rounded-md shadow-sm"
                >
                  <p className="font-semibold text-blue-600">{benefit.title}</p>
                  <p className="text-gray-600 mt-1">{benefit.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;