---
title: "每日一题：A Regular Expression Matcher"
date: 2018-02-09
type: post
isCJKLanguage: true
categories:
    - "历史归档"
---

# 每日一题：A Regular Expression Matcher
选自*Beautiful Code*第一章：A Regular Expression Matcher。
## Task & Background
(节选自*Beautiful Code*)
> In 1998, Rob Pike and I were writing The Practice of Programming (Addison-Wesley). The last chapter of the book, “Notation,” collected a number of examples where good notation led to better programs and better programming. This included the use of simple data specifications (printf, for instance), and the generation of code from tables.
Because of our Unix backgrounds and nearly 30 years of experience with tools based on regular expression notation, we naturally wanted to include a discussion of regular expressions, and it seemed mandatory to include an implementation as well. Given our emphasis on tools, it also seemed best to focus on the class of regular expressions found in grep—rather than, say, those from shell wildcards—since we could also then talk about the design of grep itself.
The problem was that any existing regular expression package was far too big. The local grep was over 500 lines long (about 10 book pages) and encrusted with barnacles. Open source regular expression packages tended to be huge—roughly the size of the entire book—because they were engineered for generality, flexibility, and speed; none were remotely suitable for pedagogy.
I suggested to Rob that we find the smallest regular expression package that would illustrate the basic ideas while still recognizing a useful and nontrivial class of patterns. Ideally,the code would fit on a single page.
Rob disappeared into his office. As I remember it now, he emerged in no more than an hour or two with the 30 lines of C code that subsequently appeared in Chapter 9 of The Practice of Programming. That code implements a regular expression matcher that handles the following constructs.

| Character | Meaning    |
| -         | :-:        |
| c         | Matchs any literal character c |
| .(period) | Matchs any single character    |
| ^         | Matchs the beginning of the input string |
| $         | Matchs the end of the input string |
| *         | Matchs zero or more occurences of the previous character |

This is quite a useful class; in my own experience of using regular expressions on a day-today basis, it easily accounts for 95 percent of all instances. In many situations, solving the right problem is a big step toward creating a beautiful program. Rob deserves great credit for choosing a very small yet important, well-defined, and extensible set of features from among a wide set of options.

## Solution
```
int matchhere(char *, char *);
int matchstar(int, char *, char *);

/* match: search for regexp anywhere in text */
int match(char *regexp, char *text) {
    if (regexp[0] == '^') {
        return matchhere(regexp+1, text);
    }
    do {
        if (matchhere(regexp, text)) {
            return 1;
        }
    } while (*text++ != '\0');
    return 0;
}


/* matchhere: search for regexp at beginning of text */
int matchhere(char *regexp, char *text) {
    if (regexp[0] == '\0') {
        return 1;
    }
    if (regexp[1] == '*') {
        return matchstar(regexp[0], regexp+2, text);
    }
    if (regexp[0] == '$' && regexp[1] == '\0') {
        return *text == '\0';
    }
    if (*text != '\0' && (regexp[0] == '.' || regexp[0] == *text)) {
        return matchhere(regexp+1, text+1);
    }
    return 0;
}


/* matchstar: search for c*regexp at beginning of text */
int matchstar(int c, char *regexp, char *text) {
    do {
        if (matchhere(regexp, text)) {
            return 1;
        }
    } while (*text != '\0' && (*text++ == c || c == '.'));
    return 0;
}

```

## Comment
Rob’s implementation itself is a superb example of beautiful code: compact, elegant, efficient, and useful. It’s one of the best examples of recursion that I have ever seen, and it shows the power of C pointers. Although at the time we were most interested in conveying the important role of good notation in making a program easier to use (and perhaps easier to write as well), the regular expression code has also been an excellent way to illustrate algorithms, data structures, testing, performance enhancement, and other important topics.
