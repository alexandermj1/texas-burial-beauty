import { motion } from "framer-motion";
import { ArrowRight, Calendar, Clock, Phone, Mail } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import blogHeroBg from "@/assets/hero/cemetery-cathedral.jpg";
import springCleaningImg from "@/assets/blog/spring-cleaning-hero.jpg";

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  readTime: string;
  excerpt: string;
  content: React.ReactNode;
  image: string;
}

const blogPosts: BlogPost[] = [
  {
    slug: "spring-cleaning-cemetery-property",
    title: "A Simple Task That Makes a Big Difference",
    date: "February 26, 2026",
    readTime: "4 min read",
    excerpt: "Spring is a time for fresh starts, clean slates, and checking off those lingering items on your to-do list. One item is often overlooked: unused or unwanted cemetery property.",
    image: springCleaningImg,
    content: (
      <>
        <p className="text-lg leading-relaxed text-foreground/80 mb-6">
          Spring is a time for fresh starts, clean slates, and checking off those lingering items on your to-do list. Often, we organize closets, review finances, and simplify our lives – but one item is often overlooked: <strong className="text-foreground">unused or unwanted cemetery property</strong>.
        </p>
        <p className="text-lg leading-relaxed text-foreground/80 mb-8">
          If you or your family own cemetery plots, mausoleum crypts, or cremation niches that are no longer needed, this spring is the perfect time to take action.
        </p>
        <h2 className="font-display text-2xl md:text-3xl text-foreground mb-4">Why Cemetery Property Often Goes Unused</h2>
        <p className="text-lg leading-relaxed text-foreground/80 mb-6">
          Life changes. Families relocate, burial plans evolve, and properties purchased years ago may no longer fit your wishes. Instead of letting that property sit idle, reselling it can bring both financial relief and peace of mind.
        </p>
        <div className="bg-gradient-sage rounded-2xl p-8 my-10">
          <h3 className="font-display text-xl text-foreground mb-4">Selling unwanted cemetery property can help you:</h3>
          <ul className="space-y-3">
            {["Free yourself from ongoing maintenance or ownership concerns.", "Recover funds that can be used for current priorities.", "Simplify estate planning and reduce burdens on loved ones.", "Start your spring feeling organized and in control."].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-foreground/80">
                <span className="w-2 h-2 rounded-full bg-primary mt-2.5 shrink-0" />
                <span className="text-base leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-lg leading-relaxed text-foreground/80 mb-8">For many families, it's not just about the money – it's about <em>closure and clarity</em>.</p>
        <h2 className="font-display text-2xl md:text-3xl text-foreground mb-4">How Can We Help You</h2>
        <p className="text-lg leading-relaxed text-foreground/80 mb-6">Selling cemetery property can be complicated. Working with our team of Texas professionals — backed by 29+ years of resale experience through our partnership with Bay Cemetery Brokers — gives you peace of mind and a stress-free process.</p>
        <p className="text-lg leading-relaxed text-foreground/80 mb-8">Texas Cemetery Brokers has growing knowledge of the state's leading memorial parks, including <strong className="text-foreground">Restland Memorial Park</strong> Dallas, <strong className="text-foreground">Sparkman/Hillcrest</strong> Dallas, <strong className="text-foreground">Mount Olivet Cemetery</strong> Fort Worth, <strong className="text-foreground">Forest Park Lawndale</strong> Houston, <strong className="text-foreground">Memorial Oaks</strong> Houston, <strong className="text-foreground">Glenwood Cemetery</strong> Houston, <strong className="text-foreground">Texas State Cemetery</strong> Austin, <strong className="text-foreground">Mission Burial Park</strong> San Antonio and many others across Texas.</p>
        <h2 className="font-display text-2xl md:text-3xl text-foreground mb-4">Start This Spring with One Less Thing to Worry About</h2>
        <p className="text-lg leading-relaxed text-foreground/80 mb-6">As you look at your to-do list this spring, consider adding — and checking off — this important task. A fresh start begins with letting go of what no longer fits, and spring is the perfect time to do just that.</p>
        <div className="bg-card rounded-2xl p-8 shadow-soft border border-border/50 my-10">
          <p className="text-lg text-foreground mb-4">Please reach out to us. We can help turn your unwanted cemetery property into cash.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="tel:+12142560795" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all"><Phone className="w-4 h-4" /> (214) 256-0795</a>
            <a href="mailto:Help@TexasCemeteryBrokers.com" className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-medium rounded-full text-sm hover:opacity-90 transition-all"><Mail className="w-4 h-4" /> Help@TexasCemeteryBrokers.com</a>
          </div>
        </div>
      </>
    ),
  },
];

const BlogIndex = () => (
  <div className="min-h-screen bg-background">
    <Seo
      title="The Journal | Texas Cemetery Brokers Insights & Guidance"
      description="Expert advice on Texas cemetery property, estate planning, the resale process, and helping families navigate end-of-life decisions with care."
      path="/blog"
    />
    <Navbar forceScrolled />

    {/* Hero — magazine-style with photo background */}
    <section className="relative pt-28 pb-14 overflow-hidden">
      <img src={blogHeroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/65 to-foreground/45" />
      <div className="relative container mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-4xl">
          <p className="text-primary-foreground/70 text-xs tracking-[0.3em] uppercase font-medium mb-3 drop-shadow">The Journal</p>
          <h1 className="font-display text-4xl md:text-6xl text-primary-foreground mb-3 drop-shadow-lg">Insights & Guidance</h1>
          <p className="text-primary-foreground/85 text-lg font-light max-w-xl drop-shadow-md">Expert advice on cemetery property, estate planning, and the resale process.</p>
        </motion.div>
      </div>
    </section>

    {/* Articles Grid */}
    <section className="py-16">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl">
          {blogPosts.map((post, i) => (
            <motion.div key={post.slug} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}>
              <Link to={`/blog/${post.slug}`} className="group block bg-card rounded-2xl overflow-hidden shadow-soft hover:shadow-hover hover:-translate-y-1 transition-all duration-300 border border-border/60">
                <div className="h-52 overflow-hidden">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{post.date}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime}</span>
                  </div>
                  <h2 className="font-display text-xl text-foreground mb-2 group-hover:text-primary transition-colors">{post.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{post.excerpt}</p>
                  <span className="inline-flex items-center gap-1.5 text-primary font-medium text-sm group-hover:gap-2 transition-all">Read article <ArrowRight className="w-3.5 h-3.5" /></span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

const BlogArticle = ({ post }: { post: BlogPost }) => (
  <div className="min-h-screen bg-background">
    <Seo
      title={`${post.title} | Texas Cemetery Brokers Journal`}
      description={post.excerpt}
      path={`/blog/${post.slug}`}
      type="article"
      image={post.image}
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        description: post.excerpt,
        image: post.image,
        datePublished: post.date,
        author: { "@type": "Organization", name: "Texas Cemetery Brokers" },
        publisher: { "@id": "https://texas-burial-beauty.lovable.app/#organization" },
        mainEntityOfPage: `https://texas-burial-beauty.lovable.app/blog/${post.slug}`,
      }}
    />
    <Navbar forceScrolled />

    {/* Article Hero — photo with dark overlay */}
    <section className="relative pt-28 pb-12 overflow-hidden">
      <img src={blogHeroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/75 to-foreground/55" />
      <div className="relative container mx-auto px-6 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-primary-foreground/70 text-sm font-medium mb-6 hover:text-primary-foreground transition-colors drop-shadow">← Back to journal</Link>
          <div className="flex items-center gap-3 mb-4 text-sm text-primary-foreground/70 drop-shadow">
            <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{post.date}</span>
            <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{post.readTime}</span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl text-primary-foreground leading-tight drop-shadow-lg">{post.title}</h1>
        </motion.div>
      </div>
    </section>

    {/* Feature image */}
    <div className="container mx-auto px-6 -mt-0">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-hover -mb-8 relative z-10">
        <img src={post.image} alt={post.title} className="w-full h-64 md:h-80 object-cover" />
      </motion.div>
    </div>

    <article className="py-14 pt-16">
      <div className="container mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="max-w-3xl mx-auto">
          <div className="w-16 h-px bg-primary/40 mb-10" />
          <div className="prose-custom">{post.content}</div>
        </motion.div>
      </div>
    </article>

    <Footer />
  </div>
);

const Blog = () => {
  const { slug } = useParams();
  if (slug) {
    const post = blogPosts.find(p => p.slug === slug);
    if (!post) return <BlogIndex />;
    return <BlogArticle post={post} />;
  }
  return <BlogIndex />;
};

export default Blog;
