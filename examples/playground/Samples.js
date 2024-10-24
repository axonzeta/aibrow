export default {
  json: {
    tool: 'coreModel',
    forms: {
      model: {
        temperature: 0.1
      },
      tool: {
        grammar: JSON.stringify({
          type: 'object',
          properties: {
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            country: { type: 'string' }
          }
        }, null, 2),
        input: 'Extract data from the following text: "John Doe is an innovative software developer with a passion for creating intuitive user experiences. Based in the heart of England, John has spent the past decade refining his craft, working with both startups and established tech companies. His deep commitment to quality and creativity is evident in the numerous award-winning apps he has developed, which continue to enrich the digital lives of users worldwide. Beyond his technical skills, John is admired for his collaborative spirit and mentorship, always eager to share his knowledge and inspire the next generation of tech enthusiasts."'
      }
    }
  },
  'summarize-article': {
    tool: 'summarizer',
    forms: {
      tool: {
        type: 'tl;dr',
        format: 'plain-text',
        length: 'short',
        input: `Vim vs. Emacs: Why Vim Might Be the Better Choice

The debate between Vim and Emacs is a classic one in the world of text editors, each boasting its own ardent supporters. While both editors have unique strengths, Vim is often favored for its speed, efficiency, and minimalist design. Here's a deeper look into why some users consider Vim superior to Emacs.

1. Efficiency and Speed

Modal Editing System:
Vim uses a modal editing system which is one of its most powerful features. By separating the editing and navigation modes, Vim allows users to perform text manipulations without constantly reaching for the mouse or arrow keys. This can lead to a significant increase in productivity once the user gets accustomed to the workflow.

Lightweight and Fast:
Vim is built for speed, consuming fewer system resources than Emacs. This efficiency shines when working over SSH on remote servers, where a lightweight editor can make all the difference in responsiveness.

2. Learning Curve and Command Structure

Predictable Command Structure:
Vim commands are often cited as intuitive for those who understand its logic. Commands are usually composed of a verb (an action like delete, yank, or change) and a noun (the object like word, line, or paragraph), making them predictable once you become familiar with them.

Mnemonic Keystrokes:
Many Vim commands are mnemonic, so 'd' is for delete, 'y' for yank (copy), and 'p' for paste. This consistency can help new users learn commands more quickly compared to Emacs, which often requires memorizing longer keystroke combinations.

3. Customization and Community Support

Vimscript and Plugins:
Vim's scripting language, Vimscript, along with a vast array of plugins, allows for extensive customization. The community contributes a vast number of plugins that can add functionality to Vim, transforming it into a highly tailored development environment.

Active Community:
Vim has a large, active community with a wealth of resources for new learners. There are plenty of tutorials, forums, and community contributions which make getting started and finding help much easier.

4. Availability and Versatility

Pre-installed and Available Everywhere:
Vim is often pre-installed on Unix systems and can be found on nearly every platform, including Windows, Mac, and Linux. This ubiquity makes it an editor that you can rely on in almost any situation, particularly when working on different systems.

Cross-Platform Consistency:
Vim's consistent interface across different operating systems ensures that you don’t have to re-learn or adjust settings for different platforms. This is especially useful for developers or sysadmins who work across multiple environments.

5. Focus on Code Editing

Designed for Code:
Vim excels in programming environments, offering syntax highlighting, code folding, and a host of editing functions specifically designed for coding. Its efficiency and precision tools help in navigating code bases swiftly and accurately.

Minimal Distraction:
Vim’s minimalistic design helps reduce distractions. Unlike Emacs, which can be configured to do anything from email to browsing, Vim focuses on being an editor, allowing the user to maintain focus on coding tasks.

Conclusion

While both Vim and Emacs have their strengths, Vim's efficiency, speed, and minimalist philosophy make it a preferred choice for many developers and text editing aficionados. Its unique modal structure, combined with a strong community and vast plugin support, provides a powerful and efficient editing experience. However, the choice ultimately boils down to personal preference and use case. For those who value speed and efficiency, and are willing to tackle the steeper initial learning curve, Vim is an excellent choice.
`
      }
    }
  },
  'write-article': {
    tool: 'writer',
    forms: {
      tool: {
        tone: 'casual',
        length: 'short',
        input: 'Vim vs Emacs'
      }
    }
  },
  'rewrite-article': {
    tool: 'rewriter',
    forms: {
      tool: {
        tone: 'more-formal',
        length: 'as-is',
        input: 'Vim is known for its simplicity, speed, and flexibility. It has basic commands that are easy to learn while still being powerful enough to handle complex tasks effectively, making it ideal for both beginners and experienced users who seek efficiency and control over their workflow. On the other hand, Emacs is a more robust editor with comprehensive features and customization options.'
      }
    }
  }
}
