import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Users, TrendingUp, ArrowRight, CheckCircle, Clock, Circle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import heroImage from '@/assets/hero-civic.jpg';
import featureReport from '@/assets/feature-report.png';
import featureMap from '@/assets/feature-map.png';
import featureCommunity from '@/assets/feature-community.png';

/*
  Palette (light / dark)
  deep teal      #0B4F4A  /  text + surfaces go to #E8F5EF on #071F1D
  emerald-teal   #14A38B  (accent in both modes)
  warm off-white #FAF7F0  /  #071F1D page, #0C2E2B cards
  pale mint      #DDF3EA  /  #0A2A27 section, #14504A borders

  Dark mode uses Tailwind's `dark:` variant, so it follows the same `.dark`
  class (or system setting) as the rest of your app.
*/

// Reusable class sets so light and dark stay in sync everywhere
const heading = 'text-[#0B4F4A] dark:text-[#E8F5EF]';
const body = 'text-[#0B4F4A]/70 dark:text-[#DDF3EA]/70';
const surface = 'bg-[#FFFDF8] dark:bg-[#0C2E2B] border border-[#DDF3EA] dark:border-[#14504A]';

// Same scoring as the profile page, shown here so people know what earns points.
const POINT_RULES = [
  { value: '+10', label: 'for every report you submit' },
  { value: '+5', label: 'for each upvote your report gets' },
  { value: '+20', label: 'when your report is in progress' },
  { value: '+50', label: 'when your report is resolved' },
];

// The three statuses a report moves through on the map.
const LIFECYCLE = [
  { icon: Circle, label: 'Reported', note: 'Photo, category and exact location saved' },
  { icon: Clock, label: 'In progress', note: 'Your neighbors upvote, the status updates' },
  { icon: CheckCircle, label: 'Resolved', note: 'The issue is fixed and you earn bonus points' },
];

const Home = () => {
  const { currentUser } = useAuth();

  return (
    <div className="civic-home min-h-screen bg-[#FAF7F0] dark:bg-[#071F1D] text-[#0B4F4A] dark:text-[#E8F5EF] transition-colors">
      {/* Hero Section */}
      <section className="civic-hero relative overflow-hidden bg-[#0B4F4A] dark:bg-[#052321]">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Teal wash keeps the photo atmospheric while text stays readable */}
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#0B4F4A] via-[#0B4F4A]/90 to-[#0B4F4A]/70 dark:from-[#052321] dark:via-[#052321]/92 dark:to-[#052321]/80" />

        <div className="relative z-10 container mx-auto px-4 py-20 md:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-7">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] text-[#FAF7F0]">
                Make your city better, together.
              </h1>

              <p className="text-lg md:text-xl text-[#DDF3EA]/85 max-w-xl leading-relaxed">
                Report civic issues, track their resolution, and engage with your community.
                CivicLink empowers citizens to create positive change.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                {currentUser ? (
                  <Button
                    size="lg"
                    asChild
                    className="text-lg px-8 bg-[#14A38B] hover:bg-[#0E8A75] text-white shadow-lg shadow-black/20"
                  >
                    <Link to="/report">
                      Report an Issue
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button
                      size="lg"
                      asChild
                      className="text-lg px-8 bg-[#14A38B] hover:bg-[#0E8A75] text-white shadow-lg shadow-black/20"
                    >
                      <Link to="/auth?mode=signup">
                        Get Started
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      asChild
                      className="text-lg px-8 bg-transparent border-[#DDF3EA]/50 text-[#FAF7F0] hover:bg-[#DDF3EA]/10 hover:text-[#FAF7F0]"
                    >
                      <Link to="/map">View Map</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Report lifecycle: the one memorable element in the hero */}
            <div className="rounded-3xl bg-[#FAF7F0] dark:bg-[#0C2E2B] dark:border dark:border-[#14504A] p-6 md:p-7 shadow-2xl shadow-black/25">
              <p className={`text-sm font-semibold ${body}`}>What happens to a report</p>
              <ol className="mt-5 space-y-0">
                {LIFECYCLE.map(({ icon: Icon, label, note }, i) => (
                  <li key={label} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < LIFECYCLE.length - 1 && (
                      <span className="absolute left-[19px] top-10 bottom-0 w-px bg-[#B5E3D2] dark:bg-[#14504A]" aria-hidden="true" />
                    )}
                    <span
                      className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        i === LIFECYCLE.length - 1
                          ? 'bg-[#14A38B] text-white'
                          : 'bg-[#DDF3EA] text-[#0B4F4A] dark:bg-[#14504A] dark:text-[#DDF3EA]'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className={`font-semibold ${heading}`}>{label}</p>
                      <p className={`text-sm leading-relaxed ${body}`}>{note}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-[#FAF7F0] dark:bg-[#071F1D]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 tracking-tight ${heading}`}>
              How CivicLink Works
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${body}`}>
              Our platform makes civic engagement simple, transparent, and effective
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className={`civic-feature ${surface} rounded-2xl shadow-sm hover:shadow-md dark:hover:border-[#14A38B]/60 transition-all`}>
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                {/* Circle stays light in dark mode so the feature icons remain visible */}
                <div className="mx-auto w-24 h-24 rounded-full bg-[#DDF3EA] flex items-center justify-center">
                  <img src={featureReport} alt="Report" className="w-16 h-16" />
                </div>
                <h3 className={`text-xl font-semibold ${heading}`}>Report Issues</h3>
                <p className={`leading-relaxed ${body}`}>
                  Quickly report civic issues with photos and location. Our AI helps categorize them automatically.
                </p>
              </CardContent>
            </Card>

            <Card className={`civic-feature ${surface} rounded-2xl shadow-sm hover:shadow-md dark:hover:border-[#14A38B]/60 transition-all`}>
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className="mx-auto w-24 h-24 rounded-full bg-[#DDF3EA] flex items-center justify-center">
                  <img src={featureMap} alt="Track" className="w-16 h-16" />
                </div>
                <h3 className={`text-xl font-semibold ${heading}`}>Track Progress</h3>
                <p className={`leading-relaxed ${body}`}>
                  View all reported issues on an interactive map. See real-time status updates and resolutions.
                </p>
              </CardContent>
            </Card>

            <Card className={`civic-feature ${surface} rounded-2xl shadow-sm hover:shadow-md dark:hover:border-[#14A38B]/60 transition-all`}>
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className="mx-auto w-24 h-24 rounded-full bg-[#DDF3EA] flex items-center justify-center">
                  <img src={featureCommunity} alt="Engage" className="w-16 h-16" />
                </div>
                <h3 className={`text-xl font-semibold ${heading}`}>Engage Community</h3>
                <p className={`leading-relaxed ${body}`}>
                  Upvote important issues, add comments, and earn badges for your contributions to the community.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Points Section */}
      <section className="py-16 bg-[#DDF3EA] dark:bg-[#0A2A27] dark:border-y dark:border-[#14504A]">
        <div className="container mx-auto px-4">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div className="space-y-3">
              <h2 className={`text-3xl font-bold tracking-tight ${heading}`}>
                Every report earns points.
              </h2>
              <p className="text-[#0B4F4A]/75 dark:text-[#DDF3EA]/75 leading-relaxed max-w-md">
                Collect points as your reports get noticed and fixed, then unlock badges from New Reporter to Community Legend.
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {POINT_RULES.map(rule => (
                <div key={rule.value} className="rounded-2xl bg-[#FAF7F0] dark:bg-[#0C2E2B] dark:border dark:border-[#14504A] p-4 shadow-sm">
                  <dt className="text-3xl font-bold text-[#14A38B]">{rule.value}</dt>
                  <dd className="mt-1 text-sm text-[#0B4F4A]/75 dark:text-[#DDF3EA]/75 leading-snug">{rule.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="civic-impact py-20 bg-[#0B4F4A] dark:bg-[#052321] text-[#FAF7F0]">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-10 md:gap-0 text-center md:divide-x md:divide-[#DDF3EA]/20">
            <div className="space-y-2 px-4">
              <MapPin className="h-10 w-10 mx-auto text-[#14A38B]" />
              <div className="text-5xl font-bold tracking-tight">1,000+</div>
              <div className="text-lg text-[#DDF3EA]/85">Issues Reported</div>
            </div>
            <div className="space-y-2 px-4">
              <Users className="h-10 w-10 mx-auto text-[#14A38B]" />
              <div className="text-5xl font-bold tracking-tight">500+</div>
              <div className="text-lg text-[#DDF3EA]/85">Active Citizens</div>
            </div>
            <div className="space-y-2 px-4">
              <TrendingUp className="h-10 w-10 mx-auto text-[#14A38B]" />
              <div className="text-5xl font-bold tracking-tight">85%</div>
              <div className="text-lg text-[#DDF3EA]/85">Resolution Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!currentUser && (
        <section className="py-20 bg-[#FAF7F0] dark:bg-[#071F1D]">
          <div className="container mx-auto px-4">
            <Card className="bg-[#DDF3EA] dark:bg-[#0C2E2B] border border-[#B5E3D2] dark:border-[#14504A] rounded-3xl shadow-sm">
              <CardContent className="py-14 text-center space-y-6">
                <h2 className={`text-3xl md:text-4xl font-bold tracking-tight ${heading}`}>
                  Ready to Make a Difference?
                </h2>
                <p className="text-lg text-[#0B4F4A]/75 dark:text-[#DDF3EA]/75 max-w-2xl mx-auto">
                  Join thousands of citizens working together to improve our community
                </p>
                <Button
                  size="lg"
                  asChild
                  className="text-lg px-8 bg-[#0B4F4A] hover:bg-[#083B37] text-[#FAF7F0] dark:bg-[#14A38B] dark:hover:bg-[#0E8A75] dark:text-white"
                >
                  <Link to="/auth?mode=signup">
                    Sign Up Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;