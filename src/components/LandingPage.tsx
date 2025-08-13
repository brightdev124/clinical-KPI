import React, { useState } from 'react';
import { Activity, BarChart3, Users, Target, TrendingUp, CheckCircle, ArrowRight, Star, Shield, Zap, AlertTriangle, MessageSquare, FileX, ArrowDown, Check, X, FileText, BarChart, ClipboardCheck, TrendingDown, Clock, UserCheck, Heart, Award, Lock, Send, Mail } from 'lucide-react';
import AuthModal from './AuthModal';
import { useNameFormatter } from '../utils/nameFormatter';

const LandingPage: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot-password'>('login');
  const formatName = useNameFormatter();
  const [currentStep, setCurrentStep] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    organization: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const features = [
    {
      icon: Target,
      title: 'KPI Management',
      description: 'Define and track up to 15 weighted KPIs with customizable scoring systems',
      color: 'bg-blue-500'
    },
    {
      icon: BarChart3,
      title: 'Performance Tracking',
      description: 'Real-time dashboards with monthly tracking and performance insights',
      color: 'bg-green-500'
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Organize employees by department with role-based access controls',
      color: 'bg-purple-500'
    },
    {
      icon: TrendingUp,
      title: 'Monthly Reviews',
      description: 'Structured review workflow with notes, plans, and file attachments',
      color: 'bg-orange-500'
    }
  ];

  const problemPoints = [
    {
      icon: MessageSquare,
      title: 'Avoiding hard conversations',
      description: 'Directors sidestep difficult performance discussions, letting issues fester',
      color: 'text-red-600'
    },
    {
      icon: UserCheck,
      title: 'Acting more like union reps',
      description: 'Defending employees instead of setting clear expectations and standards',
      color: 'text-orange-600'
    },
    {
      icon: FileX,
      title: 'No documentation, no follow-through',
      description: 'Conversations happen but nothing gets recorded or tracked for improvement',
      color: 'text-yellow-600'
    }
  ];

  const solutionSteps = [
    {
      icon: Target,
      title: 'Set KPIs',
      description: 'Define clear, measurable performance indicators',
      color: 'bg-blue-500'
    },
    {
      icon: ClipboardCheck,
      title: 'Score Check-ins',
      description: 'Simple checkbox system - met or not met',
      color: 'bg-green-500'
    },
    {
      icon: FileText,
      title: 'Document',
      description: 'Record conversations and improvement plans',
      color: 'bg-purple-500'
    },
    {
      icon: BarChart,
      title: 'Track',
      description: 'Monitor progress over time with trends',
      color: 'bg-orange-500'
    },
    {
      icon: TrendingUp,
      title: 'Report',
      description: 'Generate insights and performance summaries',
      color: 'bg-pink-500'
    }
  ];

  const clinicalFeatures = [
    {
      icon: Zap,
      title: 'Zero training required',
      description: 'Intuitive interface that clinical directors can use immediately',
      highlight: true
    },
    {
      icon: Target,
      title: 'Trackable accountability',
      description: 'Clear documentation trail for all performance conversations',
      highlight: false
    },
    {
      icon: Heart,
      title: 'Feedback-driven performance culture',
      description: 'Transform reactive management into proactive development',
      highlight: false
    },
    {
      icon: Lock,
      title: 'HIPAA-friendly',
      description: 'Secure, compliant platform designed for healthcare environments',
      highlight: true
    }
  ];

  const testimonials = [
    {
      name: 'Dr. Sarah Johnson',
      role: 'Clinical',
      content: 'This platform transformed how we track and improve clinical performance. The insights are invaluable.',
      rating: 5
    },
    {
      name: 'Michael Chen',
      role: 'Clinical',
      content: 'Finally, a solution that makes KPI tracking simple and actionable. Our team loves the intuitive interface.',
      rating: 5
    },
    {
      name: 'Dr. Emily Rodriguez',
      role: 'Clinical',
      content: 'The weighted scoring system and trend analysis help us identify improvement opportunities quickly.',
      rating: 5
    }
  ];

  const handleAuthClick = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleContactClick = () => {
    setShowContactModal(true);
  };

  const handleContactFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setContactForm({
      ...contactForm,
      [e.target.name]: e.target.value
    });
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Simulate sending email (in a real app, you'd call an API endpoint)
      const emailBody = `
Name: ${contactForm.name}
Email: ${contactForm.email}
Organization: ${contactForm.organization}

Message:
${contactForm.message}
      `;
      
      // Create mailto link with form data
      const mailtoLink = `mailto:minajoh@yahoo.com?subject=Contact from ${contactForm.name} - Clinical KPI System&body=${encodeURIComponent(emailBody)}`;
      window.location.href = mailtoLink;
      
      // Show success message
      setSubmitSuccess(true);
      setTimeout(() => {
        setShowContactModal(false);
        setSubmitSuccess(false);
        setContactForm({ name: '', email: '', organization: '', message: '' });
      }, 2000);
      
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-advance carousel
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % solutionSteps.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <img src="/assets/logo_simple.png" alt="Logo" className="h-10 flex-shrink-0" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                KPI Brain
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleAuthClick('login')}
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={handleContactClick}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full text-blue-800 text-sm font-medium mb-8">
              <Zap className="w-4 h-4 mr-2" />
              Transform Your Clinical Performance Management
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Built for employees who manage employees
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block">
                You can’t improve what you can’t see
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Streamline clinical performance reviews with weighted KPI scoring, automated trend analysis, 
              and actionable insights that drive continuous improvement.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => handleAuthClick('signup')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center"
              >
                Start Free Trial
              </button>              
            </div>
          </div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-purple-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-20 w-16 h-16 bg-green-200 rounded-full opacity-20 animate-pulse delay-500"></div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-32 h-32 border-2 border-red-400 rounded-full"></div>
          <div className="absolute top-40 right-20 w-24 h-24 border-2 border-orange-400 rounded-full"></div>
          <div className="absolute bottom-20 left-1/4 w-20 h-20 border-2 border-yellow-400 rounded-full"></div>
          <div className="absolute bottom-40 right-1/3 w-28 h-28 border-2 border-red-400 rounded-full"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 leading-tight">
              Do Your Clinical Directors Know What Drives Margin?
            </h2>
            <p className="text-xl text-gray-700 max-w-4xl mx-auto leading-relaxed font-medium">
              Most clinical leaders aren’t trained to manage performance. The result? Missed KPIs, unaddressed underperformance, and revenue leakage across your regions.
            </p>
            
            {/* Warning Stats */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-red-100">
                <div className="text-3xl font-bold text-red-600 mb-2">73%</div>
                <div className="text-sm text-gray-700 font-medium">of directors avoid difficult conversations</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-orange-100">
                <div className="text-3xl font-bold text-orange-600 mb-2">68%</div>
                <div className="text-sm text-gray-700 font-medium">lack structured documentation</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-yellow-100">
                <div className="text-3xl font-bold text-yellow-600 mb-2">81%</div>
                <div className="text-sm text-gray-700 font-medium">report inconsistent follow-through</div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {problemPoints.map((problem, index) => (
              <div key={index} className="group bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border-l-4 border-red-400 relative overflow-hidden">
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <problem.icon className={`w-7 h-7 ${problem.color}`} />
                    </div>
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                      <X className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full mb-3">
                      CRITICAL ISSUE #{index + 1}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-4 leading-tight">{problem.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{problem.description}</p>
                  
                  {/* Impact indicator */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600 font-medium">
                        {index === 0 && "Leads to unresolved performance issues"}
                        {index === 1 && "Creates toxic team dynamics"}
                        {index === 2 && "Results in repeated mistakes"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Enhanced Solution Bridge */}
          <div className="relative">
            {/* Animated arrow pointing down */}
            <div className="flex justify-center mb-8">
              <div className="animate-bounce">
                <ArrowDown className="w-8 h-8 text-red-500" />
              </div>
            </div>
            
            <div className="text-center">
              <div className="relative inline-block">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-30 scale-110"></div>
                
                <div className="relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-white font-bold text-lg shadow-2xl transform hover:scale-105 transition-all duration-300">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-3">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  KPI Brain will help you help them track important KPIs
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center ml-3">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
              
              <p className="mt-6 text-gray-600 max-w-2xl mx-auto font-medium">
                KPIbrain gives clinical directors a simple, structured way to track KPIs, document conversations, and drive the outcomes your business depends on
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full text-blue-800 text-sm font-medium mb-6">
              <CheckCircle className="w-4 h-4 mr-2" />
              The Solution
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              How KPI Brain Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              A simple check-the-box tool to track if employees are meeting KPIs
            </p>
            <div className="bg-white rounded-xl p-6 max-w-2xl mx-auto shadow-lg border border-blue-200">
              <div className="grid grid-cols-2 gap-6 text-left">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-gray-700 font-medium">Yes they did → Check the box</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <X className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="text-gray-700 font-medium">No they didn't → Document & plan</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Interactive Carousel */}
          <div className="relative">
            <div className="flex justify-center mb-8">
              <div className="flex space-x-2">
                {solutionSteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentStep ? 'bg-blue-600 w-8' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {solutionSteps.map((step, index) => (
                <div
                  key={index}
                  className={`group relative bg-white rounded-2xl p-6 shadow-lg transition-all duration-500 transform ${
                    index === currentStep 
                      ? 'scale-105 shadow-2xl ring-4 ring-blue-200' 
                      : 'hover:shadow-xl hover:-translate-y-1'
                  }`}
                >
                  <div className={`w-14 h-14 ${step.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
                  
                  {/* Step number */}
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{index + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-green-100 rounded-full text-green-800 text-sm font-medium mb-6">
              <Heart className="w-4 h-4 mr-2" />
              Clinical Excellence
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Built for Clinical Teams
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Designed specifically for healthcare environments with the features that matter most
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {clinicalFeatures.map((feature, index) => (
              <div 
                key={index} 
                className={`group p-8 rounded-2xl transition-all duration-300 transform hover:-translate-y-2 ${
                  feature.highlight 
                    ? 'bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 shadow-xl' 
                    : 'bg-gray-50 hover:bg-white border border-gray-200 hover:shadow-lg'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${
                    feature.highlight ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gray-200'
                  }`}>
                    <feature.icon className={`w-6 h-6 ${feature.highlight ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center">
                      {feature.title}
                      {feature.highlight && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                          Key Feature
                        </span>
                      )}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

         
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-yellow-100 rounded-full text-yellow-800 text-sm font-medium mb-6">
              <Award className="w-4 h-4 mr-2" />
              Leadership Insight
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Trusted by Healthcare Leaders
            </h2>
          </div>
          
          {/* Featured Testimonial */}
          <div className="mb-16">
            <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-4xl mx-auto border border-gray-100">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
                  ))}
                </div>
                <blockquote className="text-2xl font-medium text-gray-900 leading-relaxed mb-6">
                  "Communication usually flows the wrong way. When clinical directors relay employees' problems instead of setting expectations, they fail to establish clear standards for their team. With KPI Brain, they are now the voice of accountability."
                </blockquote>
                <div className="flex items-center justify-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl font-bold">JM</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Jennifer Martinez</div>
                    <div className="text-gray-600">Clinical Operations Leader</div>
                    <div className="text-sm text-gray-500">Regional Medical Center</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Testimonials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {formatName(testimonial.name).split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{formatName(testimonial.name)}</div>
                    <div className="text-gray-500 text-sm">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white">
            <h2 className="text-4xl font-bold mb-4">
              Ready to bring structure to employee leadership?
            </h2>           
            <button
              onClick={handleContactClick}
              className="bg-white mt-4 text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 inline-flex items-center"
            >
              Contact Us - Get Started Today
              <Mail className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <img src="/assets/logo_simple.png" alt="Clinical KPI Logo" className="h-8 flex-shrink-0" />
              <span className="text-xl font-bold">KPI Brain</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2024 Clinical KPI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSwitchMode={(mode) => setAuthMode(mode)}
        />
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Contact Us</h2>
                    <p className="text-sm text-gray-600">Get started with Clinical KPI System</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {submitSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-600">Your email client should open with your message. We'll get back to you soon!</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={contactForm.name}
                      onChange={handleContactFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={contactForm.email}
                      onChange={handleContactFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">
                      Organization
                    </label>
                    <input
                      type="text"
                      id="organization"
                      name="organization"
                      value={contactForm.organization}
                      onChange={handleContactFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your healthcare organization"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={4}
                      value={contactForm.message}
                      onChange={handleContactFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Tell us about your needs and how we can help you get started..."
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowContactModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200 flex items-center justify-center disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;