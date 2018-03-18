webpackJsonp([84530823256904],{1126:function(n,s){n.exports={data:{site:{siteMetadata:{docsDirectory:"docs",github:{url:"https://github.com/n6g7/redux-saga-firebase"}}},file:{base:"syncing-data.md",sourceInstanceName:"guides",markdown:{html:'<p>Although making synchronisation easy to use is one of the primary goal of this library, there are a few things that are important to understand to avoid common pitfalls.</p>\n<p>In this guide we\'ll implement a data synchronisation saga that supports common scenarios such as:</p>\n<ul>\n<li>starting and stoping the synchronisation process via actions</li>\n<li>handling user login/logout and permissions</li>\n</ul>\n<p>We\'ll iterate over several implementations to get to a complete solution.</p>\n<div class="ui info message">\n  <p class="header">Sagas <=> processes</p>\n  <p>\n    As always with redux-saga it\'s helpful to think of sagas as processes, and to understand the difference between <code>fork</code> and <code>exec</code>.\n    If you\'re not already familiar with these concepts already you should read <a href="https://en.wikipedia.org/wiki/Fork%E2%80%93exec">the wikipedia entry</a> as well as <a href="https://redux-saga.js.org/docs/advanced/ForkModel.html">redux-saga\'s fork model doc</a> before continuing with this guide.\n  </p>\n</div>\n<h2>Starting point</h2>\n<p>This is the simplest way to synchronize data:</p>\n<div class="gatsby-highlight">\n      <pre class="language-js"><code class="language-js"><span class="token keyword">function</span> <span class="token operator">*</span> <span class="token function">rootSaga</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>\n  <span class="token keyword">yield</span> <span class="token function">fork</span><span class="token punctuation">(</span>\n    rsf<span class="token punctuation">.</span>database<span class="token punctuation">.</span>sync<span class="token punctuation">,</span>\n    <span class="token string">\'todos\'</span><span class="token punctuation">,</span>\n    <span class="token punctuation">{</span> successActionCreator<span class="token punctuation">:</span> setTodos <span class="token punctuation">}</span>\n  <span class="token punctuation">)</span>\n<span class="token punctuation">}</span>\n</code></pre>\n      </div>\n<p>Or, with firestore:</p>\n<div class="gatsby-highlight">\n      <pre class="language-js"><code class="language-js"><span class="token keyword">function</span> <span class="token operator">*</span> <span class="token function">rootSaga</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>\n  <span class="token keyword">yield</span> <span class="token function">fork</span><span class="token punctuation">(</span>\n    rsf<span class="token punctuation">.</span>firestore<span class="token punctuation">.</span>syncCollection<span class="token punctuation">,</span>\n    <span class="token string">\'todos\'</span><span class="token punctuation">,</span>\n    <span class="token punctuation">{</span> successActionCreator<span class="token punctuation">:</span> setTodos <span class="token punctuation">}</span>\n  <span class="token punctuation">)</span>\n<span class="token punctuation">}</span>\n</code></pre>\n      </div>\n<div class="ui info message">\n  <p class="header">Realtime DB <=> Firestore</p>\n  <p>\n    We\'ll use the realtime database for the rest of this guide but the strategies described below work exactly the same using firestore.\n  </p>\n</div>\n<div class="ui warning message">\n  <p class="header">Effect creators</p>\n  <p>\n    If you\'re not sure why we use <code>yield fork(rsf.database.sync, ...)</code> instead of simply <code>yield rsf.database.sync(...)</code> in the examples above then you should read <a href="https://redux-saga.js.org/docs/basics/DeclarativeEffects.html">redux-saga\'s docs</a> before continuing with this guide.\n  </p>\n</div>\n<p>In the above, when <code>rootSaga</code> starts, it starts an <em>attached fork</em> which runs <code>rsf.database.sync</code> "in the background".\nThis means that <code>rootSaga</code> isn\'t blocked by the <code>yield fork(...)</code> line and, when it stops, so does <code>rsf.database.sync</code>.</p>\n<p>Since <code>rootSaga</code> is redux-saga\'s root saga it will never stop and so, in the above example, the synchronization process will never stop.</p>\n<p>But what if I need to pause the sync process and restart it later?</p>\n<h2>Responding to actions</h2>\n<p>Now let\'s assume we have two actions being dispatched by another part of the system (ie. the user pressing buttons): <code>RESUME_SYNC</code> and <code>PAUSE_SYNC</code>.</p>\n<p>First, once we have a sync saga running, how can we take <code>PAUSE_SYNC</code> into account to pause the sync process?\nLet\'s list what needs to happen in the root saga:</p>\n<ul>\n<li>start the sync saga</li>\n<li>wait for a <code>PAUSE_SYNC</code> action</li>\n<li>stop the sync saga</li>\n</ul>\n<p>To implement this we can use <a href="https://redux-saga.js.org/docs/advanced/TaskCancellation.html">tasks</a>.\nTask objects represent running sagas and we can use them to stop a saga running the background.</p>\n<p>Using the <a href="https://redux-saga.js.org/docs/api/#takepattern"><code>take</code> effect creator</a> to wait for the pause action and the <a href="https://redux-saga.js.org/docs/api/#canceltask"><code>cancel</code> effect creator</a> to cancel the running task we get:</p>\n<div class="gatsby-highlight">\n      <pre class="language-js"><code class="language-js"><span class="token keyword">function</span> <span class="token operator">*</span> <span class="token function">rootSaga</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>\n  <span class="token comment">// Start the sync saga</span>\n  <span class="token keyword">const</span> task <span class="token operator">=</span> <span class="token keyword">yield</span> <span class="token function">fork</span><span class="token punctuation">(</span>\n    rsf<span class="token punctuation">.</span>database<span class="token punctuation">.</span>sync<span class="token punctuation">,</span>\n    <span class="token string">\'todos\'</span><span class="token punctuation">,</span>\n    <span class="token punctuation">{</span> successActionCreator<span class="token punctuation">:</span> setTodos <span class="token punctuation">}</span>\n  <span class="token punctuation">)</span>\n\n  <span class="token comment">// Wait for the pause action</span>\n  <span class="token keyword">yield</span> <span class="token function">take</span><span class="token punctuation">(</span><span class="token string">\'PAUSE_SYNC\'</span><span class="token punctuation">)</span>\n\n  <span class="token comment">// Stop the sync saga</span>\n  <span class="token keyword">yield</span> <span class="token function">cancel</span><span class="token punctuation">(</span>task<span class="token punctuation">)</span>\n<span class="token punctuation">}</span>\n</code></pre>\n      </div>\n<p>Now what about restarting?\nWe need to:</p>\n<ul>\n<li>start the sync saga</li>\n<li>wait for a <code>PAUSE_SYNC</code> action</li>\n<li>stop the sync saga</li>\n<li>wait for a <code>RESUME_SYNC</code> action</li>\n<li>restart the sync saga</li>\n</ul>\n<p>Or, to be able to pause/resume sync as many times as we want:</p>\n<ul>\n<li>\n<p>infinite loop:</p>\n<ul>\n<li>start the sync saga</li>\n<li>wait for a <code>PAUSE_SYNC</code> action</li>\n<li>stop the sync saga</li>\n<li>wait for a <code>RESUME_SYNC</code> action</li>\n</ul>\n</li>\n</ul>\n<div class="ui info message">\n  <p class="header">Inifinite loops in saga</p>\n  <p>\n    Note that it\'s ok to have an infinite loop here because <code>yield</code> gives back control while waiting so we don\'t actually use up all CPU cycles. 😉\n  </p>\n</div>\n<p>So we end up with:</p>\n<div class="gatsby-highlight">\n      <pre class="language-js"><code class="language-js"><span class="token keyword">function</span> <span class="token operator">*</span> <span class="token function">rootSaga</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>\n  <span class="token keyword">while</span> <span class="token punctuation">(</span><span class="token boolean">true</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>\n    <span class="token comment">// Start the sync saga</span>\n    <span class="token keyword">let</span> task <span class="token operator">=</span> <span class="token keyword">yield</span> <span class="token function">fork</span><span class="token punctuation">(</span>\n      rsf<span class="token punctuation">.</span>database<span class="token punctuation">.</span>sync<span class="token punctuation">,</span>\n      <span class="token string">\'todos\'</span><span class="token punctuation">,</span>\n      <span class="token punctuation">{</span> successActionCreator<span class="token punctuation">:</span> setTodos <span class="token punctuation">}</span>\n    <span class="token punctuation">)</span>\n\n    <span class="token comment">// Wait for the pause action, then stop sync</span>\n    <span class="token keyword">yield</span> <span class="token function">take</span><span class="token punctuation">(</span><span class="token string">\'PAUSE_SYNC\'</span><span class="token punctuation">)</span>\n    <span class="token keyword">yield</span> <span class="token function">cancel</span><span class="token punctuation">(</span>task<span class="token punctuation">)</span>\n\n    <span class="token comment">// Wait for the resume action</span>\n    <span class="token keyword">yield</span> <span class="token function">take</span><span class="token punctuation">(</span><span class="token string">\'RESUME_SYNC\'</span><span class="token punctuation">)</span>\n  <span class="token punctuation">}</span>\n<span class="token punctuation">}</span>\n</code></pre>\n      </div>\n<p>That\'s a perfectly fine saga, but what if we want to sync user-specific data (ie. not always at <code>todos</code>)? 🤔</p>\n<h2>Syncing user data</h2>\n<p>Let\'s now synchronize our user\'s notifications stored in <code>notifications/:userId</code>.</p>\n<p>The actions we\'re going to listen for are slightly different: <code>LOGIN</code> and <code>LOGOUT</code> instead of <code>SYNC_RESUME</code> and <code>SYNC_PAUSE</code>, but they essentially serve the same purpose.\nWe also won\'t start the sync process automatically when the application starts anymore.</p>\n<p>We only need a couple changes to get this to work:</p>\n<div class="gatsby-highlight">\n      <pre class="language-js"><code class="language-js"><span class="token keyword">function</span> <span class="token operator">*</span> <span class="token function">rootSaga</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>\n  <span class="token keyword">while</span> <span class="token punctuation">(</span><span class="token boolean">true</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>\n    <span class="token comment">// Wait for a user to login</span>\n    <span class="token keyword">const</span> loginAction <span class="token operator">=</span> <span class="token keyword">yield</span> <span class="token function">take</span><span class="token punctuation">(</span><span class="token string">\'LOGIN\'</span><span class="token punctuation">)</span>\n\n    <span class="token comment">// Start the sync saga</span>\n    <span class="token keyword">let</span> task <span class="token operator">=</span> <span class="token keyword">yield</span> <span class="token function">fork</span><span class="token punctuation">(</span>\n      rsf<span class="token punctuation">.</span>database<span class="token punctuation">.</span>sync<span class="token punctuation">,</span>\n      <span class="token template-string"><span class="token string">`notifications/</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">${</span>loginAction<span class="token punctuation">.</span>userId<span class="token interpolation-punctuation punctuation">}</span></span><span class="token string">`</span></span><span class="token punctuation">,</span>\n      <span class="token punctuation">{</span> successActionCreator<span class="token punctuation">:</span> syncNotifications <span class="token punctuation">}</span>\n    <span class="token punctuation">)</span>\n\n    <span class="token comment">// Wait for the logout action, then stop sync</span>\n    <span class="token keyword">yield</span> <span class="token function">take</span><span class="token punctuation">(</span><span class="token string">\'LOGOUT\'</span><span class="token punctuation">)</span>\n    <span class="token keyword">yield</span> <span class="token function">cancel</span><span class="token punctuation">(</span>task<span class="token punctuation">)</span>\n  <span class="token punctuation">}</span>\n<span class="token punctuation">}</span>\n</code></pre>\n      </div>\n<p>So what changed?</p>\n<ul>\n<li>waiting for <code>RESUME_SYNC</code>/<code>LOGIN</code> was moved to the start of loop to make sure we don\'t automatically start syncing when the app starts</li>\n<li>the <code>sync</code>ed path (<code>notifications/${loginAction.userId}</code>) now depends on the content of the action that\'s returned by <code>yield take(\'LOGIN\')</code></li>\n</ul>\n<div class="ui warning message">\n  <p class="header">Permissions in firebase</p>\n  <p>\n    When configured correctly, firebase won\'t let any random user read data from <code>notifications/123</code>, only a user logged in with id 123 will be able to read that.\n  </p>\n  <p>\n    So, if you forget to stop the synchronisation saga for <code>notifications/123</code> when user 123 logs out, you\'ll start seeing permission errors in the console because you\'re no longer allowed to access this data.\n  </p>\n  <p>\n    <strong>Don\'t forget to stop background saga when you don\'t need them anymore!</strong>\n  </p>\n  <p>\n    For more details, check out <a href="https://github.com/n6g7/redux-saga-firebase/issues/92">issue #92</a>.\n  </p>\n</div>\n<p>And that\'s it!</p>\n<p>This should work as expected when users log in and out, however we\'ve kinda been re-inventing the wheel here, let\'s see how we can refactor this.</p>\n<h2>Refactor</h2>\n<p>Let\'s start by extracting our code to a separate saga:</p>\n<div class="gatsby-highlight">\n      <pre class="language-diff"><code class="language-diff">  function * rootSaga () {\n<span class="token inserted">+   yield fork(syncSaga)</span>\n<span class="token inserted">+   // other stuff</span>\n<span class="token inserted">+ }</span>\n<span class="token inserted">+</span>\n<span class="token inserted">+ function * syncSaga () {</span>\n    while (true) {\n      // Wait for a user to login\n      const loginAction = yield take(\'LOGIN\')\n\n      // Start the sync saga\n      let task = yield fork(\n        rsf.database.sync,\n        `notifications/${loginAction.userId}`,\n        { successActionCreator: syncNotifications }\n      )\n\n      // Wait for the logout action, then stop sync\n      yield take(\'LOGOUT\')\n      yield cancel(task)\n    }\n  }\n</code></pre>\n      </div>\n<p>It\'s a small change but it allows us to start several sagas from <code>rootSaga</code> and to move <code>syncSaga</code> to another file if necessary.</p>\n<p>Then let\'s rewrite our code using <a href="https://redux-saga.js.org/docs/api/#takelatestpattern-saga-args"><code>takeLatest</code></a>.</p>\n<p>Essentially, <code>takeLatest</code> starts a saga whenever an action is dispatched, so we could use it to start <code>syncSaga</code> whenever <code>LOGIN</code> is dispatched and get rid of this distasteful <code>while(true)</code> loop:</p>\n<div class="gatsby-highlight">\n      <pre class="language-js"><code class="language-js"><span class="token keyword">function</span> <span class="token operator">*</span> <span class="token function">rootSaga</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>\n  <span class="token keyword">yield</span> <span class="token function">takeLatest</span><span class="token punctuation">(</span><span class="token string">\'LOGIN\'</span><span class="token punctuation">,</span> syncSaga<span class="token punctuation">)</span>\n  <span class="token comment">// other stuff</span>\n<span class="token punctuation">}</span>\n\n<span class="token keyword">function</span> <span class="token operator">*</span> <span class="token function">syncSaga</span> <span class="token punctuation">(</span>action<span class="token punctuation">)</span> <span class="token punctuation">{</span>\n  <span class="token comment">// Start the sync saga</span>\n  <span class="token keyword">let</span> task <span class="token operator">=</span> <span class="token keyword">yield</span> <span class="token function">fork</span><span class="token punctuation">(</span>\n    rsf<span class="token punctuation">.</span>database<span class="token punctuation">.</span>sync<span class="token punctuation">,</span>\n    <span class="token template-string"><span class="token string">`notifications/</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">${</span>action<span class="token punctuation">.</span>userId<span class="token interpolation-punctuation punctuation">}</span></span><span class="token string">`</span></span><span class="token punctuation">,</span>\n    <span class="token punctuation">{</span> successActionCreator<span class="token punctuation">:</span> syncNotifications <span class="token punctuation">}</span>\n  <span class="token punctuation">)</span>\n\n  <span class="token comment">// Wait for the logout action, then stop sync</span>\n  <span class="token keyword">yield</span> <span class="token function">take</span><span class="token punctuation">(</span><span class="token string">\'LOGOUT\'</span><span class="token punctuation">)</span>\n  <span class="token keyword">yield</span> <span class="token function">cancel</span><span class="token punctuation">(</span>task<span class="token punctuation">)</span>\n<span class="token punctuation">}</span>\n</code></pre>\n      </div>\n<p>No need to wait for <code>LOGIN</code> manually anymore, and no need to think about this infinite loop either!</p>\n<h2>Conclusion</h2>\n<p>Learnings:</p>\n<ul>\n<li><code>fork</code>ed sagas run "in the background" and aren\'t blocking</li>\n<li><a href="https://redux-saga.js.org/docs/api/#task">task</a> objects let us start and stop background sagas (ie. data synchronization sagas)</li>\n<li>high level effect creators (<code>takeEvery</code>, <code>takeLatest</code>) save time and prevent headaches, use them!</li>\n</ul>\n<p>For more details, check out <a href="https://github.com/n6g7/redux-saga-firebase/issues/92">issue #92</a>.</p>',frontmatter:{title:"Syncing data"}}}},pathContext:{fileName:"syncing-data"}}}});
//# sourceMappingURL=path---guides-syncing-data-d377eb2c5ef2ff9d3444.js.map